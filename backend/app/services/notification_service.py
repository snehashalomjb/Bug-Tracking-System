import logging
from sqlalchemy.orm import Session
from app.models.models import Notification

logger = logging.getLogger("bug_tracker")

class NotificationService:
    @staticmethod
    def create_notification(db: Session, user_id: int, message: str) -> Notification:
        """Create a notification in the database for a user and trigger email dispatch."""
        db_notification = Notification(
            user_id=user_id,
            message=message,
            is_read=False
        )
        db.add(db_notification)
        db.commit()
        db.refresh(db_notification)
        
        # Trigger email mock dispatch
        NotificationService.send_email_mock(user_id, message)
        
        return db_notification

    @staticmethod
    def send_email_mock(user_id: int, message: str) -> None:
        """Mock email dispatch by logging details. Easy to switch to SMTP client later."""
        logger.info(f"[EMAIL MOCK] Sending mail notification to User ID: {user_id}. Content: {message}")

    @classmethod
    def notify_bug_assigned(cls, db: Session, assignee_id: int, bug_title: str, bug_id: int) -> None:
        message = f"You have been assigned to bug ID {bug_id}: '{bug_title}'"
        cls.create_notification(db, assignee_id, message)

    @classmethod
    def notify_status_updated(cls, db: Session, user_id: int, bug_title: str, bug_id: int, new_status: str) -> None:
        message = f"Bug ID {bug_id} ('{bug_title}') status was updated to '{new_status}'"
        cls.create_notification(db, user_id, message)

    @classmethod
    def notify_comment_added(cls, db: Session, user_id: int, commenter_name: str, bug_title: str, bug_id: int) -> None:
        message = f"{commenter_name} added a comment on bug ID {bug_id}: '{bug_title}'"
        cls.create_notification(db, user_id, message)

    @classmethod
    def notify_bug_closed(cls, db: Session, user_id: int, bug_title: str, bug_id: int) -> None:
        message = f"Bug ID {bug_id} ('{bug_title}') has been closed."
        cls.create_notification(db, user_id, message)
