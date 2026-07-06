from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.project import UserMin

class BugPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class BugSeverity(str, Enum):
    MINOR = "Minor"
    MAJOR = "Major"
    CRITICAL = "Critical"
    BLOCKER = "Blocker"

class BugStatus(str, Enum):
    NEW = "New"
    OPEN = "Open"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    TESTING = "Testing"
    RESOLVED = "Resolved"
    CLOSED = "Closed"
    REOPENED = "Reopened"

class AttachmentResponse(BaseModel):
    id: int
    bug_id: int
    file_name: str
    file_type: str
    file_size: int
    file_path: str
    uploaded_by_id: Optional[int]
    uploaded_by: Optional[UserMin] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ProjectMin(BaseModel):
    id: int
    name: str
    status: str

    class Config:
        from_attributes = True

class BugBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    module_name: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    priority: BugPriority = BugPriority.MEDIUM
    severity: BugSeverity = BugSeverity.MINOR
    project_id: int
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None

class BugCreate(BugBase):
    pass

class BugUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    module_name: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    priority: Optional[BugPriority] = None
    severity: Optional[BugSeverity] = None
    status: Optional[BugStatus] = None
    assignee_id: Optional[int] = None
    due_date: Optional[date] = None

class BugResponse(BaseModel):
    id: int
    title: str
    description: str
    steps_to_reproduce: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    module_name: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    priority: BugPriority
    severity: BugSeverity
    status: BugStatus
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    reporter_id: Optional[int] = None
    reporter: Optional[UserMin] = None
    assignee_id: Optional[int] = None
    assignee: Optional[UserMin] = None
    project_id: int
    project: ProjectMin
    attachments: List[AttachmentResponse] = []

    class Config:
        from_attributes = True

class BugListResponse(BaseModel):
    items: List[BugResponse]
    total: int
    skip: int
    limit: int
