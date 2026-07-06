from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr

class UserMin(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "Active"  # Active, Completed, Archived
    start_date: date
    end_date: Optional[date] = None
    manager_id: Optional[int] = None

class ProjectCreate(ProjectBase):
    member_ids: Optional[List[int]] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    manager_id: Optional[int] = None
    member_ids: Optional[List[int]] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    start_date: date
    end_date: Optional[date] = None
    manager_id: Optional[int] = None
    manager: Optional[UserMin] = None
    members: List[UserMin] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
