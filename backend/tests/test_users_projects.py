from datetime import date, timedelta
from fastapi import status
from app.models.models import User

# Helper to register and login a user with a specific role
def get_auth_headers(client, email: str, role_name: str, db):
    # Register
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": f"{role_name} User"}
    )
    
    # Bootstrap user to have specified role in database (since register defaults to Dev/Admin)
    db_user = db.query(User).filter(User.email == email).first()
    if role_name != "Admin":
        from app.repositories.auth_repository import AuthRepository
        role = AuthRepository.get_role_by_name(db, role_name)
        db_user.roles = [role]
        db.commit()
        db.refresh(db_user)
        
    # Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"}
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# --- User Management Tests ---

def test_get_users_admin_only(client, db):
    admin_headers = get_auth_headers(client, "admin@example.com", "Admin", db)
    dev_headers = get_auth_headers(client, "dev@example.com", "Developer", db)
    
    # Dev should be forbidden (403)
    response = client.get("/api/v1/users", headers=dev_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
    
    # Admin should succeed
    response = client.get("/api/v1/users", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    assert len(response.json()) >= 2

def test_admin_create_and_delete_user(client, db):
    admin_headers = get_auth_headers(client, "admin2@example.com", "Admin", db)
    
    # Create user
    create_res = client.post(
        "/api/v1/users",
        json={
            "email": "newuser@example.com",
            "password": "Password123!",
            "full_name": "New User",
            "role_names": ["Tester"]
        },
        headers=admin_headers
    )
    assert create_res.status_code == status.HTTP_201_CREATED
    new_user = create_res.json()
    assert new_user["email"] == "newuser@example.com"
    assert new_user["roles"][0]["name"] == "Tester"
    
    # Update user
    update_res = client.put(
        f"/api/v1/users/{new_user['id']}",
        json={"full_name": "Updated Name", "is_active": False},
        headers=admin_headers
    )
    assert update_res.status_code == status.HTTP_200_OK
    assert update_res.json()["full_name"] == "Updated Name"
    assert update_res.json()["is_active"] is False
    
    # Delete user
    delete_res = client.delete(f"/api/v1/users/{new_user['id']}", headers=admin_headers)
    assert delete_res.status_code == status.HTTP_204_NO_CONTENT

def test_admin_prevent_self_deletion(client, db):
    admin_headers = get_auth_headers(client, "admin3@example.com", "Admin", db)
    admin_user = db.query(User).filter(User.email == "admin3@example.com").first()
    
    # Delete self should fail
    response = client.delete(f"/api/v1/users/{admin_user.id}", headers=admin_headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "cannot delete their own account" in response.json()["detail"].lower()


# --- Projects Module Tests ---

def test_projects_access_control(client, db):
    dev_headers = get_auth_headers(client, "dev_project@example.com", "Developer", db)
    pm_headers = get_auth_headers(client, "pm_project@example.com", "Project Manager", db)
    
    # Dev can list projects
    list_res = client.get("/api/v1/projects", headers=dev_headers)
    assert list_res.status_code == status.HTTP_200_OK
    
    # Dev cannot create projects
    create_res = client.post(
        "/api/v1/projects",
        json={
            "name": "Project Forbidden",
            "start_date": str(date.today())
        },
        headers=dev_headers
    )
    assert create_res.status_code == status.HTTP_403_FORBIDDEN
    
    # PM can create projects
    create_res = client.post(
        "/api/v1/projects",
        json={
            "name": "Project PM Created",
            "description": "Project Manager's project",
            "start_date": str(date.today())
        },
        headers=pm_headers
    )
    assert create_res.status_code == status.HTTP_201_CREATED
    assert create_res.json()["name"] == "Project PM Created"

def test_project_validations(client, db):
    pm_headers = get_auth_headers(client, "pm_val@example.com", "Project Manager", db)
    
    # Date validation: end date < start date
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "Bad Project",
            "start_date": str(date.today()),
            "end_date": str(date.today() - timedelta(days=1))
        },
        headers=pm_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "end date cannot be earlier" in response.json()["detail"].lower()
    
    # Manager validation: assigned user must be PM or Admin (Developer role is invalid manager)
    # Register a dev user first to ensure they exist in this test session
    get_auth_headers(client, "dev_project_val@example.com", "Developer", db)
    dev_user = db.query(User).filter(User.email == "dev_project_val@example.com").first()
    response = client.post(
        "/api/v1/projects",
        json={
            "name": "Bad Manager Project",
            "start_date": str(date.today()),
            "manager_id": dev_user.id
        },
        headers=pm_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "must have 'project manager' or 'admin' role" in response.json()["detail"].lower()
