from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.models.models import User, Role, RefreshToken, user_roles
from app.schemas.auth import UserRegister

class AuthRepository:
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_role_by_name(db: Session, name: str) -> Optional[Role]:
        return db.query(Role).filter(Role.name == name).first()

    @staticmethod
    def create_user(db: Session, user_in: UserRegister, hashed_password: str, role: Role) -> User:
        db_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            is_active=True
        )
        db_user.roles.append(role)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def create_refresh_token(db: Session, user_id: int, token: str, expires_at: datetime) -> RefreshToken:
        db_token = RefreshToken(
            token=token,
            user_id=user_id,
            expires_at=expires_at,
            revoked=False
        )
        db.add(db_token)
        db.commit()
        db.refresh(db_token)
        return db_token

    @staticmethod
    def get_refresh_token(db: Session, token: str) -> Optional[RefreshToken]:
        return db.query(RefreshToken).filter(RefreshToken.token == token, RefreshToken.revoked == False).first()

    @staticmethod
    def revoke_refresh_token(db: Session, token: str) -> None:
        db_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()
        if db_token:
            db_token.revoked = True
            db.commit()

    @staticmethod
    def revoke_all_user_tokens(db: Session, user_id: int) -> None:
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id, 
            RefreshToken.revoked == False
        ).update({RefreshToken.revoked: True}, synchronize_session=False)
        db.commit()
