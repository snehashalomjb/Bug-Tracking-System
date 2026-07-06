from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from app.core import security
from app.models.models import User, Role
from app.repositories.user_repository import UserRepository
from app.repositories.auth_repository import AuthRepository
from app.schemas.user import UserCreate, UserUpdate
from app.services.activity_service import ActivityService

class UserService:
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        user = UserRepository.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
        return user

    @staticmethod
    def get_all_users(db: Session) -> List[User]:
        return UserRepository.get_all_users(db)

    @staticmethod
    def create_user(db: Session, user_in: UserCreate, current_user_id: int) -> User:
        # Check if email exists
        if UserRepository.get_user_by_email(db, user_in.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )
            
        hashed_password = security.get_password_hash(user_in.password)
        
        # Get roles
        roles: List[Role] = []
        for role_name in user_in.role_names:
            role = AuthRepository.get_role_by_name(db, role_name)
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role '{role_name}' does not exist."
                )
            roles.append(role)
            
        user = UserRepository.create_user(db, user_in, hashed_password, roles)
        ActivityService.log_activity(
            db, 
            current_user_id, 
            "USER_CREATE", 
            f"Created user {user.email} with roles {', '.join(user_in.role_names)}"
        )
        return user

    @staticmethod
    def update_user(db: Session, user_id: int, user_in: UserUpdate, current_user_id: int) -> User:
        db_user = UserRepository.get_user_by_id(db, user_id)
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
            
        # Email uniqueness check
        if user_in.email and user_in.email != db_user.email:
            if UserRepository.get_user_by_email(db, user_in.email):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this email already exists."
                )
                
        hashed_password = None
        if user_in.password:
            hashed_password = security.get_password_hash(user_in.password)
            
        roles = None
        if user_in.role_names is not None:
            roles = []
            for role_name in user_in.role_names:
                role = AuthRepository.get_role_by_name(db, role_name)
                if not role:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Role '{role_name}' does not exist."
                    )
                roles.append(role)
                
        updated_user = UserRepository.update_user(
            db, db_user, user_in, hashed_password, roles
        )
        
        ActivityService.log_activity(
            db, 
            current_user_id, 
            "USER_UPDATE", 
            f"Updated user ID {user_id} ({updated_user.email})"
        )
        return updated_user

    @staticmethod
    def delete_user(db: Session, user_id: int, current_user_id: int) -> None:
        if user_id == current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin cannot delete their own account."
            )
            
        db_user = UserRepository.get_user_by_id(db, user_id)
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
            
        UserRepository.delete_user(db, db_user)
        ActivityService.log_activity(
            db, 
            current_user_id, 
            "USER_DELETE", 
            f"Deleted user ID {user_id} ({db_user.email})"
        )
