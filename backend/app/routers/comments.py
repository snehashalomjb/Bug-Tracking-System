from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.services.bug_service import BugService
from app.routers.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/comments", tags=["Comments"])

@router.post("", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new comment to a bug report. Supports mentioning users with @email or @name."""
    return BugService.add_comment(
        db, 
        bug_id=comment_in.bug_id, 
        content=comment_in.content, 
        current_user=current_user
    )

@router.get("/{bug_id}", response_model=List[CommentResponse])
def get_comments(
    bug_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all comments associated with a specific bug ID."""
    # Verify bug exists
    BugService.get_bug_by_id(db, bug_id)
    from app.repositories.bug_repository import BugRepository
    return BugRepository.get_comments_by_bug(db, bug_id)

@router.put("/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    comment_in: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update comment content (restricted to the comment author or Admin)."""
    return BugService.update_comment(db, comment_id, comment_in.content, current_user)

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment (restricted to the comment author or Admin)."""
    BugService.delete_comment(db, comment_id, current_user)
    return None
