import os
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import List, Optional, Tuple
from app.core.config import settings
from app.models.models import Bug, Comment, Attachment, User, Project
from app.repositories.bug_repository import BugRepository
from app.repositories.user_repository import UserRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.bug import BugCreate, BugUpdate, BugStatus
from app.services.activity_service import ActivityService
from app.services.notification_service import NotificationService

ALLOWED_TRANSITIONS = {
    "New": {"Open"},
    "Open": {"Assigned"},
    "Assigned": {"In Progress"},
    "In Progress": {"Testing"},
    "Testing": {"Resolved", "Reopened"},
    "Resolved": {"Closed"},
    "Closed": {"Reopened"},
    "Reopened": {"Assigned"}
}

class BugService:
    @staticmethod
    def get_bug_by_id(db: Session, bug_id: int) -> Bug:
        bug = BugRepository.get_bug_by_id(db, bug_id)
        if not bug:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bug not found."
            )
        return bug

    @staticmethod
    def get_all_bugs(db: Session, **kwargs) -> Tuple[List[Bug], int]:
        return BugRepository.get_all_bugs(db, **kwargs)

    @staticmethod
    def create_bug(db: Session, bug_in: BugCreate, current_user_id: int) -> Bug:
        # Verify project exists
        project = ProjectRepository.get_project_by_id(db, bug_in.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project does not exist."
            )
            
        # Verify assignee if provided
        if bug_in.assignee_id:
            assignee = UserRepository.get_user_by_id(db, bug_in.assignee_id)
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignee user does not exist."
                )
            
        bug = BugRepository.create_bug(db, bug_in, current_user_id)
        ActivityService.log_activity(db, current_user_id, "BUG_CREATE", f"Created bug ID {bug.id}: '{bug.title}'")
        
        # If assigned immediately, notify assignee
        if bug.assignee_id:
            NotificationService.notify_bug_assigned(db, bug.assignee_id, bug.title, bug.id)
            
        return bug

    @staticmethod
    def update_bug(db: Session, bug_id: int, bug_in: BugUpdate, current_user: User) -> Bug:
        db_bug = BugRepository.get_bug_by_id(db, bug_id)
        if not db_bug:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bug not found."
            )

        # 1. Enforce workflow transition rules if status is changing
        if bug_in.status and bug_in.status != db_bug.status:
            current_status = db_bug.status
            target_status = bug_in.status
            
            allowed = ALLOWED_TRANSITIONS.get(current_status, set())
            if target_status not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Workflow violation: Cannot transition bug from '{current_status}' to '{target_status}'."
                )
                
            # Perform Role-Based checks on status transition
            user_roles = [r.name for r in current_user.roles]
            # Devs should only move Assigned -> In Progress -> Testing
            if "Developer" in user_roles and "Admin" not in user_roles and "Project Manager" not in user_roles:
                if target_status not in {"In Progress", "Testing", "Assigned"}:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Developers can only transition bugs to 'In Progress' or 'Testing'."
                    )
            # Testers should only move Testing -> Resolved/Reopened, or Resolved -> Closed
            if "Tester" in user_roles and "Admin" not in user_roles and "Project Manager" not in user_roles:
                if target_status not in {"Resolved", "Reopened", "Closed"}:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Testers can only transition bugs to 'Resolved', 'Reopened', or 'Closed'."
                    )

        # 2. Check assignee changes
        assignee_changed = False
        if bug_in.assignee_id is not None and bug_in.assignee_id != db_bug.assignee_id:
            assignee_changed = True
            assignee = UserRepository.get_user_by_id(db, bug_in.assignee_id)
            if not assignee:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignee user does not exist."
                )

        old_status = db_bug.status
        updated_bug = BugRepository.update_bug(db, db_bug, bug_in)

        # Notifications & Activities
        if bug_in.status and bug_in.status != old_status:
            ActivityService.log_activity(
                db, current_user.id, "STATUS_CHANGE", 
                f"Changed bug ID {bug_id} status from '{old_status}' to '{bug_in.status}'"
            )
            # Notify reporter & assignee
            if updated_bug.reporter_id and updated_bug.reporter_id != current_user.id:
                NotificationService.notify_status_updated(db, updated_bug.reporter_id, updated_bug.title, updated_bug.id, updated_bug.status)
            if updated_bug.assignee_id and updated_bug.assignee_id != current_user.id:
                NotificationService.notify_status_updated(db, updated_bug.assignee_id, updated_bug.title, updated_bug.id, updated_bug.status)
                
            if updated_bug.status == "Closed":
                if updated_bug.reporter_id:
                    NotificationService.notify_bug_closed(db, updated_bug.reporter_id, updated_bug.title, updated_bug.id)
                if updated_bug.assignee_id:
                    NotificationService.notify_bug_closed(db, updated_bug.assignee_id, updated_bug.title, updated_bug.id)

        if assignee_changed:
            ActivityService.log_activity(
                db, current_user.id, "BUG_ASSIGNMENT", 
                f"Assigned bug ID {bug_id} to user ID {updated_bug.assignee_id}"
            )
            NotificationService.notify_bug_assigned(db, updated_bug.assignee_id, updated_bug.title, updated_bug.id)

        return updated_bug

    @staticmethod
    def delete_bug(db: Session, bug_id: int, current_user_id: int) -> None:
        db_bug = BugRepository.get_bug_by_id(db, bug_id)
        if not db_bug:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bug not found."
            )
        # Delete attachments from disk first
        for attachment in db_bug.attachments:
            if os.path.exists(attachment.file_path):
                try:
                    os.remove(attachment.file_path)
                except Exception:
                    pass
        BugRepository.delete_bug(db, db_bug)
        ActivityService.log_activity(db, current_user_id, "BUG_DELETE", f"Deleted bug ID {bug_id}")

    # --- Comments Service ---
    @staticmethod
    def add_comment(db: Session, bug_id: int, content: str, current_user: User) -> Comment:
        bug = BugRepository.get_bug_by_id(db, bug_id)
        if not bug:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bug not found."
            )
            
        comment = BugRepository.create_comment(db, bug_id, current_user.id, content)
        ActivityService.log_activity(db, current_user.id, "COMMENT_ADD", f"Added comment on bug ID {bug_id}")

        # Notify reporter and assignee
        notified_users = {current_user.id}
        if bug.reporter_id and bug.reporter_id not in notified_users:
            NotificationService.notify_comment_added(db, bug.reporter_id, current_user.full_name, bug.title, bug.id)
            notified_users.add(bug.reporter_id)
        if bug.assignee_id and bug.assignee_id not in notified_users:
            NotificationService.notify_comment_added(db, bug.assignee_id, current_user.full_name, bug.title, bug.id)
            notified_users.add(bug.assignee_id)

        # Parse mentions (@email or @full_name) and trigger custom notifications
        words = content.split()
        for word in words:
            if word.startswith("@"):
                # Clean prefix/suffix
                email_or_name = word.lstrip("@").rstrip(",.:;!?")
                # Look up user by email
                tagged_user = db.query(User).filter((User.email == email_or_name) | (User.full_name == email_or_name)).first()
                if tagged_user and tagged_user.id not in notified_users:
                    NotificationService.create_notification(
                        db, tagged_user.id, 
                        f"You were mentioned by {current_user.full_name} in bug ID {bug.id} comments"
                    )
                    notified_users.add(tagged_user.id)

        return comment

    @staticmethod
    def update_comment(db: Session, comment_id: int, content: str, current_user: User) -> Comment:
        db_comment = BugRepository.get_comment_by_id(db, comment_id)
        if not db_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found."
            )
            
        # Permission check: author or Admin
        user_roles = [r.name for r in current_user.roles]
        if db_comment.user_id != current_user.id and "Admin" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to edit this comment."
            )
            
        return BugRepository.update_comment(db, db_comment, content)

    @staticmethod
    def delete_comment(db: Session, comment_id: int, current_user: User) -> None:
        db_comment = BugRepository.get_comment_by_id(db, comment_id)
        if not db_comment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comment not found."
            )
            
        # Permission check: author or Admin
        user_roles = [r.name for r in current_user.roles]
        if db_comment.user_id != current_user.id and "Admin" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this comment."
            )
            
        BugRepository.delete_comment(db, db_comment)

    # --- File Uploads Service ---
    @staticmethod
    def add_attachment(
        db: Session, 
        bug_id: int, 
        file: UploadFile, 
        current_user_id: int
    ) -> Attachment:
        # Validate bug exists
        bug = BugRepository.get_bug_by_id(db, bug_id)
        if not bug:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bug not found."
            )

        # Validate file size
        # Read contents to check size, then seek back
        contents = file.file.read()
        file_size = len(contents)
        file.file.seek(0)
        
        if file_size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of 5MB."
            )

        # Validate file type extension
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '.{ext}' is not allowed. Supported formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # Generate a unique disk filename
        unique_filename = f"{bug_id}_{uuid.uuid4().hex}_{file.filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

        # Save to disk
        with open(file_path, "wb") as f:
            f.write(contents)

        # Save attachment record
        attachment = BugRepository.create_attachment(
            db, bug_id, file_path, file.filename, file.content_type, file_size, current_user_id
        )
        
        ActivityService.log_activity(
            db, current_user_id, "ATTACHMENT_UPLOAD", 
            f"Uploaded attachment '{file.filename}' (ID: {attachment.id}) to bug ID {bug_id}"
        )
        
        return attachment

    @staticmethod
    def delete_attachment(db: Session, attachment_id: int, current_user: User) -> None:
        db_attachment = BugRepository.get_attachment_by_id(db, attachment_id)
        if not db_attachment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attachment not found."
            )

        # Check permission: uploader, Project Manager, or Admin
        user_roles = [r.name for r in current_user.roles]
        if (db_attachment.uploaded_by_id != current_user.id and 
            "Admin" not in user_roles and "Project Manager" not in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this attachment."
            )

        # Remove from disk
        if os.path.exists(db_attachment.file_path):
            try:
                os.remove(db_attachment.file_path)
            except Exception as e:
                # Log but continue deletion from DB
                pass

        # Delete database entry
        BugRepository.delete_attachment(db, db_attachment)
        ActivityService.log_activity(
            db, current_user.id, "ATTACHMENT_DELETE", 
            f"Deleted attachment ID {attachment_id} ('{db_attachment.file_name}') from bug ID {db_attachment.bug_id}"
        )
