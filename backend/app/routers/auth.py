from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, TokenRefresh, UserResponse
from app.services.auth_service import AuthService
from app.routers.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Register a new user in the system. The first user becomes Admin, subsequent users become Developer."""
    return AuthService.register_user(db, user_in)

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning tokens."""
    user = AuthService.authenticate_user(db, login_in.email, login_in.password)
    return AuthService.create_user_tokens(db, user.id)

@router.post("/refresh", response_model=TokenResponse)
def refresh(refresh_in: TokenRefresh, db: Session = Depends(get_db)):
    """Rotate JWT access and refresh tokens."""
    return AuthService.refresh_access_token(db, refresh_in.refresh_token)

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(refresh_in: TokenRefresh, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Logout current user and revoke their refresh token."""
    AuthService.logout_user(db, refresh_in.refresh_token, current_user.id)
    return None

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return current_user
