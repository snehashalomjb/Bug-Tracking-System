from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional, Tuple
from app.core import security
from app.core.config import settings
from app.models.models import User, Role
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import UserRegister, TokenResponse
from app.services.activity_service import ActivityService

class AuthService:
    @staticmethod
    def ensure_roles_seeded(db: Session) -> None:
        """Seed default roles if they do not exist."""
        roles = {
            "Admin": "Administrator with full system access",
            "Project Manager": "Manages projects and project members",
            "Developer": "Works on resolving bugs",
            "Tester": "Identifies and reports bugs"
        }
        for name, desc in roles.items():
            role = AuthRepository.get_role_by_name(db, name)
            if not role:
                db.add(Role(name=name, description=desc))
        db.commit()

    @classmethod
    def register_user(cls, db: Session, user_in: UserRegister) -> User:
        """Registers a user. If it's the first user, assign Admin; otherwise Developer."""
        cls.ensure_roles_seeded(db)
        
        # Check if email is already taken
        if AuthRepository.get_user_by_email(db, user_in.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered."
            )
            
        hashed_password = security.get_password_hash(user_in.password)
        
        # Bootstrap: Check if this is the first user
        users_count = db.query(User).count()
        role_name = "Admin" if users_count == 0 else "Developer"
        role = AuthRepository.get_role_by_name(db, role_name)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Role {role_name} not initialized."
            )
            
        user = AuthRepository.create_user(db, user_in, hashed_password, role)
        ActivityService.log_activity(db, user.id, "USER_CREATE", f"Registered new user with role {role_name}")
        return user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> User:
        """Authenticate email and password, returning User if successful."""
        user = AuthRepository.get_user_by_email(db, email)
        if not user or not security.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive."
            )
        ActivityService.log_activity(db, user.id, "LOGIN", "User logged in successfully")
        return user

    @staticmethod
    def create_user_tokens(db: Session, user_id: int) -> TokenResponse:
        """Create access and refresh tokens, saving refresh token to database."""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        access_token = security.create_access_token(user_id, expires_delta=access_token_expires)
        refresh_token_str = security.create_refresh_token(user_id, expires_delta=refresh_token_expires)
        
        # Expiry time for database
        expires_at = datetime.now(timezone.utc) + refresh_token_expires
        
        # Store refresh token
        AuthRepository.create_refresh_token(db, user_id, refresh_token_str, expires_at)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str
        )

    @classmethod
    def refresh_access_token(cls, db: Session, refresh_token_str: str) -> TokenResponse:
        """Validate and rotate refresh token, generating a new pair of tokens."""
        # Decode and validate format
        payload = security.decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format or expired."
            )
            
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload."
            )
            
        user_id = int(user_id_str)
        
        # Fetch refresh token from DB
        db_token = AuthRepository.get_refresh_token(db, refresh_token_str)
        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is expired, revoked, or invalid."
            )
            
        if db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired."
            )
            
        # Revoke the old token (Token Rotation for security)
        AuthRepository.revoke_refresh_token(db, refresh_token_str)
        
        # Issue a new pair
        return cls.create_user_tokens(db, user_id)

    @staticmethod
    def logout_user(db: Session, refresh_token_str: str, current_user_id: int) -> None:
        """Revoke refresh token and log logout activity."""
        AuthRepository.revoke_refresh_token(db, refresh_token_str)
        ActivityService.log_activity(db, current_user_id, "LOGOUT", "User logged out")
