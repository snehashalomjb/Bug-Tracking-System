import io
from datetime import date
from fastapi import status
from app.models.models import User, Project, Bug, Comment, Notification
from tests.test_users_projects import get_auth_headers

def setup_project_for_bugs(client, db):
    # Register Admin & PM
    admin_headers = get_auth_headers(client, "admin_bug@example.com", "Admin", db)
    pm_headers = get_auth_headers(client, "pm_bug@example.com", "Project Manager", db)
    
    pm_user = db.query(User).filter(User.email == "pm_bug@example.com").first()
    
    # Create Project
    proj_res = client.post(
        "/api/v1/projects",
        json={
            "name": "Bug Test Project",
            "start_date": str(date.today()),
            "manager_id": pm_user.id
        },
        headers=admin_headers
    )
    return proj_res.json()["id"], admin_headers, pm_headers

# --- Bug Creation & CRUD Tests ---

def test_create_bug_success(client, db):
    proj_id, admin_headers, _ = setup_project_for_bugs(client, db)
    
    response = client.post(
        "/api/v1/bugs",
        json={
            "title": "Severe UI breakdown on login page",
            "description": "The login page CSS fails to load on Safari browsers.",
            "steps_to_reproduce": "1. Open Safari\n2. Go to /login",
            "expected_result": "Page loads with styling",
            "actual_result": "Page displays unstyled text",
            "module_name": "AuthUI",
            "browser": "Safari",
            "os": "macOS",
            "priority": "High",
            "severity": "Major",
            "project_id": proj_id
        },
        headers=admin_headers
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == "Severe UI breakdown on login page"
    assert data["status"] == "New"
    assert data["project_id"] == proj_id

def test_create_bug_invalid_project(client, db):
    _, admin_headers, _ = setup_project_for_bugs(client, db)
    response = client.post(
        "/api/v1/bugs",
        json={
            "title": "Bug with invalid project",
            "description": "Description needs to be longer than 10 characters.",
            "project_id": 999999
        },
        headers=admin_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

# --- Workflow Transitions & RBAC Tests ---

def test_bug_workflow_transitions(client, db):
    proj_id, admin_headers, pm_headers = setup_project_for_bugs(client, db)
    dev_headers = get_auth_headers(client, "dev_bug@example.com", "Developer", db)
    dev_user = db.query(User).filter(User.email == "dev_bug@example.com").first()
    
    # Create bug
    bug_res = client.post(
        "/api/v1/bugs",
        json={
            "title": "Bug for transition testing",
            "description": "Detailed bug description text.",
            "project_id": proj_id
        },
        headers=admin_headers
    )
    bug_id = bug_res.json()["id"]
    
    # 1. Transition: New -> Open (Valid)
    res = client.put(f"/api/v1/bugs/{bug_id}", json={"status": "Open"}, headers=admin_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "Open"
    
    # 2. Transition: Open -> Resolved (Invalid - skips status)
    res = client.put(f"/api/v1/bugs/{bug_id}", json={"status": "Resolved"}, headers=admin_headers)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    
    # 3. Transition: Open -> Assigned (Valid)
    res = client.put(f"/api/v1/bugs/{bug_id}", json={"status": "Assigned", "assignee_id": dev_user.id}, headers=admin_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "Assigned"
    assert res.json()["assignee_id"] == dev_user.id
    
    # 4. Transition: Assigned -> In Progress (Developer can perform this)
    res = client.put(f"/api/v1/bugs/{bug_id}", json={"status": "In Progress"}, headers=dev_headers)
    assert res.status_code == status.HTTP_200_OK
    assert res.json()["status"] == "In Progress"
    
    # 5. Developer tries to transition In Progress -> Closed (Forbidden)
    res = client.put(f"/api/v1/bugs/{bug_id}", json={"status": "Closed"}, headers=dev_headers)
    assert res.status_code == status.HTTP_400_BAD_REQUEST or res.status_code == status.HTTP_403_FORBIDDEN

# --- Searching & Filters Tests ---

def test_bug_search_and_filters(client, db):
    proj_id, admin_headers, _ = setup_project_for_bugs(client, db)
    
    # Create Bug 1
    client.post(
        "/api/v1/bugs",
        json={"title": "Keyboard issue in editor", "description": "Keyboard inputs do not register.", "project_id": proj_id, "priority": "Low"},
        headers=admin_headers
    )
    # Create Bug 2
    client.post(
        "/api/v1/bugs",
        json={"title": "Memory leak on scroll", "description": "Browser crashes after scroll.", "project_id": proj_id, "priority": "Critical"},
        headers=admin_headers
    )
    
    # Search for "editor"
    res = client.get("/api/v1/bugs?search=editor", headers=admin_headers)
    assert res.status_code == status.HTTP_200_OK
    assert len(res.json()["items"]) == 1
    assert res.json()["items"][0]["title"] == "Keyboard issue in editor"
    
    # Filter by Priority
    res = client.get("/api/v1/bugs?priority=Critical", headers=admin_headers)
    assert res.status_code == status.HTTP_200_OK
    assert len(res.json()["items"]) == 1
    assert res.json()["items"][0]["priority"] == "Critical"

# --- Comments & Mentions Tests ---

def test_comment_operations_and_mentions(client, db):
    proj_id, admin_headers, _ = setup_project_for_bugs(client, db)
    dev_headers = get_auth_headers(client, "dev_commenter@example.com", "Developer", db)
    tagged_headers = get_auth_headers(client, "tagged_user@example.com", "Developer", db)
    
    # Create bug
    bug_res = client.post(
        "/api/v1/bugs",
        json={"title": "Comment test bug report", "description": "Comment test bug description.", "project_id": proj_id},
        headers=admin_headers
    )
    bug_id = bug_res.json()["id"]
    
    # Add comment with mention
    comment_res = client.post(
        "/api/v1/comments",
        json={
            "bug_id": bug_id,
            "content": "Please look at this @tagged_user@example.com ASAP."
        },
        headers=dev_headers
    )
    assert comment_res.status_code == status.HTTP_201_CREATED
    comment_data = comment_res.json()
    assert comment_data["content"] == "Please look at this @tagged_user@example.com ASAP."
    
    # Verify notification created for tagged user
    tagged_user = db.query(User).filter(User.email == "tagged_user@example.com").first()
    notifs = db.query(Notification).filter(Notification.user_id == tagged_user.id).all()
    assert len(notifs) >= 1
    assert "mentioned" in notifs[0].message
    
    # Edit comment (Authorized)
    edit_res = client.put(
        f"/api/v1/comments/{comment_data['id']}",
        json={"content": "Updated comment text"},
        headers=dev_headers
    )
    assert edit_res.status_code == status.HTTP_200_OK
    
    # Delete comment (Unauthorized for other user)
    del_res = client.delete(f"/api/v1/comments/{comment_data['id']}", headers=tagged_headers)
    assert del_res.status_code == status.HTTP_403_FORBIDDEN
    
    # Delete comment (Authorized for Admin or author)
    del_res = client.delete(f"/api/v1/comments/{comment_data['id']}", headers=admin_headers)
    assert del_res.status_code == status.HTTP_204_NO_CONTENT

# --- File Uploads & Constraints Tests ---

def test_file_upload_constraints(client, db):
    proj_id, admin_headers, _ = setup_project_for_bugs(client, db)
    
    bug_res = client.post(
        "/api/v1/bugs",
        json={"title": "Attachment test bug", "description": "Attachment test description.", "project_id": proj_id},
        headers=admin_headers
    )
    bug_id = bug_res.json()["id"]
    
    # 1. Valid upload
    file_data = b"screenshot image dummy data"
    upload_res = client.post(
        f"/api/v1/bugs/{bug_id}/attachments",
        files={"file": ("screenshot.png", file_data, "image/png")},
        headers=admin_headers
    )
    assert upload_res.status_code == status.HTTP_201_CREATED
    assert upload_res.json()["file_name"] == "screenshot.png"
    attachment_id = upload_res.json()["id"]
    
    # 2. Invalid Extension upload
    upload_res = client.post(
        f"/api/v1/bugs/{bug_id}/attachments",
        files={"file": ("exploit.exe", b"malicious", "application/x-msdownload")},
        headers=admin_headers
    )
    assert upload_res.status_code == status.HTTP_400_BAD_REQUEST
    assert "not allowed" in upload_res.json()["detail"].lower()
    
    # 3. File too large (simulate > 5MB)
    too_large_data = b"0" * (5 * 1024 * 1024 + 1)
    upload_res = client.post(
        f"/api/v1/bugs/{bug_id}/attachments",
        files={"file": ("large_log.log", too_large_data, "text/plain")},
        headers=admin_headers
    )
    assert upload_res.status_code == status.HTTP_400_BAD_REQUEST
    assert "exceeds maximum allowed size" in upload_res.json()["detail"].lower()
    
    # Delete attachment
    del_res = client.delete(f"/api/v1/bugs/attachments/{attachment_id}", headers=admin_headers)
    assert del_res.status_code == status.HTTP_204_NO_CONTENT
