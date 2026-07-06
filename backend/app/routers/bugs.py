from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from app.database.session import get_db
from app.schemas.bug import BugCreate, BugUpdate, BugResponse, BugListResponse, AttachmentResponse
from app.services.bug_service import BugService
from app.routers.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/bugs", tags=["Bug Tracker"])

@router.get("", response_model=BugListResponse)
def get_bugs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    severity: Optional[str] = None,
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    reporter_id: Optional[int] = None,
    sort_by: str = "created_at",
    sort_desc: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Retrieve a list of bugs with search, filtering, pagination, and sorting."""
    items, total = BugService.get_all_bugs(
        db,
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        priority=priority,
        severity=severity,
        project_id=project_id,
        assignee_id=assignee_id,
        reporter_id=reporter_id,
        sort_by=sort_by,
        sort_desc=sort_desc
    )
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("", response_model=BugResponse, status_code=status.HTTP_201_CREATED)
def create_bug(
    bug_in: BugCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Report a new bug in the system."""
    return BugService.create_bug(db, bug_in, current_user.id)

@router.get("/{bug_id}", response_model=BugResponse)
def get_bug(bug_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retrieve detailed information about a specific bug."""
    return BugService.get_bug_by_id(db, bug_id)

@router.put("/{bug_id}", response_model=BugResponse)
def update_bug(
    bug_id: int,
    bug_in: BugUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update details, assignment, or transition workflow status of a bug."""
    return BugService.update_bug(db, bug_id, bug_in, current_user)

@router.delete("/{bug_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bug(
    bug_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a bug report (and all associated attachments)."""
    BugService.delete_bug(db, bug_id, current_user.id)
    return None

@router.post("/{bug_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
def upload_attachment(
    bug_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload an attachment (screenshot, log, zip) to a bug report (Max 5MB)."""
    return BugService.add_attachment(db, bug_id, file, current_user.id)

@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an attachment (restricted to uploader, PM, or Admin)."""
    BugService.delete_attachment(db, attachment_id, current_user)
    return None
