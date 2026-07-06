from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.models import Project, User
from app.schemas.project import ProjectCreate, ProjectUpdate

class ProjectRepository:
    @staticmethod
    def get_project_by_id(db: Session, project_id: int) -> Optional[Project]:
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def get_project_by_name(db: Session, name: str) -> Optional[Project]:
        return db.query(Project).filter(Project.name == name).first()

    @staticmethod
    def get_all_projects(db: Session) -> List[Project]:
        return db.query(Project).all()

    @staticmethod
    def create_project(
        db: Session, 
        project_in: ProjectCreate, 
        manager: Optional[User] = None, 
        members: List[User] = []
    ) -> Project:
        db_project = Project(
            name=project_in.name,
            description=project_in.description,
            status=project_in.status,
            start_date=project_in.start_date,
            end_date=project_in.end_date,
            manager=manager
        )
        # Add members
        for member in members:
            db_project.members.append(member)
            
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def update_project(
        db: Session,
        db_project: Project,
        project_in: ProjectUpdate,
        manager: Optional[User] = None,
        members: Optional[List[User]] = None
    ) -> Project:
        if project_in.name is not None:
            db_project.name = project_in.name
        if project_in.description is not None:
            db_project.description = project_in.description
        if project_in.status is not None:
            db_project.status = project_in.status
        if project_in.start_date is not None:
            db_project.start_date = project_in.start_date
        if project_in.end_date is not None:
            db_project.end_date = project_in.end_date
            
        if project_in.manager_id is not None:
            db_project.manager = manager
        elif hasattr(project_in, "manager_id") and project_in.manager_id is None:
            db_project.manager = None
            
        if members is not None:
            db_project.members = members
            
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def delete_project(db: Session, db_project: Project) -> None:
        db.delete(db_project)
        db.commit()
