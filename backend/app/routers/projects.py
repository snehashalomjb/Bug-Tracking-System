from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.services.project_service import ProjectService
from app.routers.deps import get_current_user, RoleChecker
from app.models.models import User

router = APIRouter(prefix="/projects", tags=["Project Management"])

# Setup guards
write_guard = Depends(RoleChecker(["Admin", "Project Manager"]))
read_guard = Depends(get_current_user)

@router.get("", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: User = read_guard):
    """Retrieve all projects in the system (accessible by all authenticated users)."""
    return ProjectService.get_all_projects(db)

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: User = write_guard
):
    """Create a new project (restricted to Admins and Project Managers)."""
    return ProjectService.create_project(db, project_in, current_user.id)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int, 
    db: Session = Depends(get_db),
    current_user: User = read_guard
):
    """Retrieve details of a specific project."""
    return ProjectService.get_project_by_id(db, project_id)

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = write_guard
):
    """Update details, manager, or member lists of a project."""
    return ProjectService.update_project(db, project_id, project_in, current_user.id)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = write_guard
):
    """Delete a project (restricted to Admins and Project Managers)."""
    ProjectService.delete_project(db, project_id, current_user.id)
    return None
