from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import date
from app.models.models import Project, User
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.activity_service import ActivityService

class ProjectService:
    @staticmethod
    def get_project_by_id(db: Session, project_id: int) -> Project:
        project = ProjectRepository.get_project_by_id(db, project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found."
            )
        return project

    @staticmethod
    def get_all_projects(db: Session) -> List[Project]:
        return ProjectRepository.get_all_projects(db)

    @staticmethod
    def create_project(db: Session, project_in: ProjectCreate, current_user_id: int) -> Project:
        # Check name unique
        if ProjectRepository.get_project_by_name(db, project_in.name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A project with this name already exists."
            )
            
        # Date validation
        if project_in.end_date and project_in.end_date < project_in.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date cannot be earlier than start date."
            )
            
        # Validate manager
        manager = None
        if project_in.manager_id:
            manager = UserRepository.get_user_by_id(db, project_in.manager_id)
            if not manager:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Manager user not found."
                )
            # Verify manager role
            manager_roles = [r.name for r in manager.roles]
            if "Project Manager" not in manager_roles and "Admin" not in manager_roles:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned manager must have 'Project Manager' or 'Admin' role."
                )
                
        # Validate members
        members: List[User] = []
        if project_in.member_ids:
            for member_id in project_in.member_ids:
                member = UserRepository.get_user_by_id(db, member_id)
                if not member:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Member user ID {member_id} not found."
                    )
                members.append(member)
                
        project = ProjectRepository.create_project(db, project_in, manager, members)
        ActivityService.log_activity(
            db, 
            current_user_id, 
            "PROJECT_CREATE", 
            f"Created project '{project.name}' (ID: {project.id})"
        )
        return project

    @staticmethod
    def update_project(
        db: Session, 
        project_id: int, 
        project_in: ProjectUpdate, 
        current_user_id: int
    ) -> Project:
        db_project = ProjectRepository.get_project_by_id(db, project_id)
        if not db_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found."
            )
            
        # Unique name check
        if project_in.name and project_in.name != db_project.name:
            if ProjectRepository.get_project_by_name(db, project_in.name):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A project with this name already exists."
                )
                
        # Date validation
        start_date = project_in.start_date or db_project.start_date
        end_date = project_in.end_date or db_project.end_date
        if end_date and end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date cannot be earlier than start date."
            )
            
        # Validate manager
        manager = None
        if project_in.manager_id is not None:
            manager = UserRepository.get_user_by_id(db, project_in.manager_id)
            if not manager:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Manager user not found."
                )
            manager_roles = [r.name for r in manager.roles]
            if "Project Manager" not in manager_roles and "Admin" not in manager_roles:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assigned manager must have 'Project Manager' or 'Admin' role."
                )
                
        # Validate members
        members = None
        if project_in.member_ids is not None:
            members = []
            for member_id in project_in.member_ids:
                member = UserRepository.get_user_by_id(db, member_id)
                if not member:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Member user ID {member_id} not found."
                    )
                members.append(member)
                
        updated_project = ProjectRepository.update_project(
            db, db_project, project_in, manager, members
        )
        
        ActivityService.log_activity(
            db, 
            current_user_id, 
            "PROJECT_UPDATE", 
            f"Updated project ID {project_id} ('{updated_project.name}')"
        )
        return updated_project

    @staticmethod
    def delete_project(db: Session, project_id: int, current_user_id: int) -> None:
        db_project = ProjectRepository.get_project_by_id(db, project_id)
        if not db_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found."
            )
            
        ProjectRepository.delete_project(db, db_project)
        ActivityService.log_activity(
            db, 
            current_user_id, 
            "PROJECT_DELETE", 
            f"Deleted project ID {project_id} ('{db_project.name}')"
        )
