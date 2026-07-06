from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.models import User, Role
from app.schemas.user import UserCreate, UserUpdate

class UserRepository:
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_all_users(db: Session) -> List[User]:
        return db.query(User).all()

    @staticmethod
    def create_user(
        db: Session, 
        user_in: UserCreate, 
        hashed_password: str, 
        roles: List[Role]
    ) -> User:
        db_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            is_active=True
        )
        for role in roles:
            db_user.roles.append(role)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def update_user(
        db: Session,
        db_user: User,
        user_in: UserUpdate,
        hashed_password: Optional[str] = None,
        roles: Optional[List[Role]] = None
    ) -> User:
        if user_in.email is not None:
            db_user.email = user_in.email
        if user_in.full_name is not None:
            db_user.full_name = user_in.full_name
        if user_in.is_active is not None:
            db_user.is_active = user_in.is_active
        if hashed_password is not None:
            db_user.hashed_password = hashed_password
            
        if roles is not None:
            db_user.roles = roles
            
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def delete_user(db: Session, db_user: User) -> None:
        db.delete(db_user)
        db.commit()
