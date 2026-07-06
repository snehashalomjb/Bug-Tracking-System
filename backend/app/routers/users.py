from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.schemas.auth import UserResponse
from app.schemas.user import UserCreate, UserUpdate, UserResetPassword
from app.services.user_service import UserService
from app.routers.deps import get_current_user, RoleChecker
from app.models.models import User

router = APIRouter(
    prefix="/users", 
    tags=["User Management"]
)

admin_guard = Depends(RoleChecker(["Admin"]))
pm_or_admin_guard = Depends(RoleChecker(["Admin", "Project Manager"]))

@router.get("", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = pm_or_admin_guard):
    """Retrieve all users in the system (accessible by Admins and PMs)."""
    return UserService.get_all_users(db)

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate, 
    db: Session = Depends(get_db),
    current_user: User = admin_guard
):
    """Create a new user with specified roles (restricted to Admins)."""
    return UserService.create_user(db, user_in, current_user.id)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = pm_or_admin_guard):
    """Retrieve details of a specific user."""
    return UserService.get_user_by_id(db, user_id)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = admin_guard
):
    """Update profile details, roles, or active state of a user (restricted to Admins)."""
    return UserService.update_user(db, user_id, user_in, current_user.id)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = admin_guard
):
    """Delete a user account from the system (restricted to Admins)."""
    UserService.delete_user(db, user_id, current_user.id)
    return None
