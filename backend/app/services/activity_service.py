from sqlalchemy.orm import Session
from app.models.models import Activity

class ActivityService:
    @staticmethod
    def log_activity(db: Session, user_id: int, action: str, details: str = None) -> Activity:
        """Create an activity log entry for the user."""
        db_activity = Activity(
            user_id=user_id,
            action=action,
            details=details
        )
        db.add(db_activity)
        db.commit()
        db.refresh(db_activity)
        return db_activity
