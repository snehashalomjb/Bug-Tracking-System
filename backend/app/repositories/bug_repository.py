from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Tuple
from datetime import date
from app.models.models import Bug, Comment, Attachment
from app.schemas.bug import BugCreate, BugUpdate

class BugRepository:
    @staticmethod
    def get_bug_by_id(db: Session, bug_id: int) -> Optional[Bug]:
        return db.query(Bug).filter(Bug.id == bug_id).first()

    @staticmethod
    def get_all_bugs(
        db: Session,
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
        sort_desc: bool = True
    ) -> Tuple[List[Bug], int]:
        query = db.query(Bug)

        # Filters
        if status:
            query = query.filter(Bug.status == status)
        if priority:
            query = query.filter(Bug.priority == priority)
        if severity:
            query = query.filter(Bug.severity == severity)
        if project_id:
            query = query.filter(Bug.project_id == project_id)
        if assignee_id:
            query = query.filter(Bug.assignee_id == assignee_id)
        if reporter_id:
            query = query.filter(Bug.reporter_id == reporter_id)

        # Text search matching title, description, or exact ID
        if search:
            search_filters = [
                Bug.title.ilike(f"%{search}%"),
                Bug.description.ilike(f"%{search}%")
            ]
            if search.isdigit():
                search_filters.append(Bug.id == int(search))
            query = query.filter(or_(*search_filters))

        # Total Count before pagination
        total_count = query.count()

        # Sorting
        sort_attr = getattr(Bug, sort_by, Bug.created_at)
        if sort_desc:
            query = query.order_by(sort_attr.desc())
        else:
            query = query.order_by(sort_attr.asc())

        # Pagination
        items = query.offset(skip).limit(limit).all()

        return items, total_count

    @staticmethod
    def create_bug(db: Session, bug_in: BugCreate, reporter_id: int) -> Bug:
        db_bug = Bug(
            title=bug_in.title,
            description=bug_in.description,
            steps_to_reproduce=bug_in.steps_to_reproduce,
            expected_result=bug_in.expected_result,
            actual_result=bug_in.actual_result,
            module_name=bug_in.module_name,
            browser=bug_in.browser,
            os=bug_in.os,
            priority=bug_in.priority,
            severity=bug_in.severity,
            status="New",  # Always defaults to New on creation
            project_id=bug_in.project_id,
            assignee_id=bug_in.assignee_id,
            reporter_id=reporter_id,
            due_date=bug_in.due_date
        )
        db.add(db_bug)
        db.commit()
        db.refresh(db_bug)
        return db_bug

    @staticmethod
    def update_bug(db: Session, db_bug: Bug, bug_in: BugUpdate) -> Bug:
        update_data = bug_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_bug, key, value)
        db.commit()
        db.refresh(db_bug)
        return db_bug

    @staticmethod
    def delete_bug(db: Session, db_bug: Bug) -> None:
        db.delete(db_bug)
        db.commit()

    # --- Comments ---
    @staticmethod
    def create_comment(db: Session, bug_id: int, user_id: int, content: str) -> Comment:
        db_comment = Comment(
            bug_id=bug_id,
            user_id=user_id,
            content=content
        )
        db.add(db_comment)
        db.commit()
        db.refresh(db_comment)
        return db_comment

    @staticmethod
    def get_comment_by_id(db: Session, comment_id: int) -> Optional[Comment]:
        return db.query(Comment).filter(Comment.id == comment_id).first()

    @staticmethod
    def get_comments_by_bug(db: Session, bug_id: int) -> List[Comment]:
        return db.query(Comment).filter(Comment.bug_id == bug_id).order_by(Comment.created_at.asc()).all()

    @staticmethod
    def update_comment(db: Session, db_comment: Comment, content: str) -> Comment:
        db_comment.content = content
        db.commit()
        db.refresh(db_comment)
        return db_comment

    @staticmethod
    def delete_comment(db: Session, db_comment: Comment) -> None:
        db.delete(db_comment)
        db.commit()

    # --- Attachments ---
    @staticmethod
    def create_attachment(
        db: Session,
        bug_id: int,
        file_path: str,
        file_name: str,
        file_type: str,
        file_size: int,
        uploaded_by_id: int
    ) -> Attachment:
        db_attachment = Attachment(
            bug_id=bug_id,
            file_path=file_path,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            uploaded_by_id=uploaded_by_id
        )
        db.add(db_attachment)
        db.commit()
        db.refresh(db_attachment)
        return db_attachment

    @staticmethod
    def get_attachment_by_id(db: Session, attachment_id: int) -> Optional[Attachment]:
        return db.query(Attachment).filter(Attachment.id == attachment_id).first()

    @staticmethod
    def delete_attachment(db: Session, db_attachment: Attachment) -> None:
        db.delete(db_attachment)
        db.commit()
