from fastapi import status

def test_register_user_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Password123!",
            "full_name": "Test User"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"
    assert "id" in data
    assert len(data["roles"]) == 1
    # First user should bootstrap to Admin role
    assert data["roles"][0]["name"] == "Admin"

def test_register_user_duplicate_email(client):
    user_data = {
        "email": "duplicate@example.com",
        "password": "Password123!",
        "full_name": "Test User"
    }
    response1 = client.post("/api/v1/auth/register", json=user_data)
    assert response1.status_code == status.HTTP_201_CREATED
    
    response2 = client.post("/api/v1/auth/register", json=user_data)
    assert response2.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response2.json()["detail"].lower()

def test_register_user_invalid_password(client):
    # Missing uppercase
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "badpwd@example.com", "password": "password123!", "full_name": "Bad Pwd"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    # Missing special character
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "badpwd2@example.com", "password": "Password123", "full_name": "Bad Pwd"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_login_success(client):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={"email": "login@example.com", "password": "Password123!", "full_name": "Login User"}
    )
    
    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@example.com", "password": "Password123!"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@example.com", "password": "Password123!"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_get_profile_authenticated(client):
    # Register and Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "profile@example.com", "password": "Password123!", "full_name": "Profile User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "profile@example.com", "password": "Password123!"}
    )
    token = login_res.json()["access_token"]
    
    # Get Profile
    response = client.get(
        "/api/v1/auth/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "profile@example.com"
    assert data["full_name"] == "Profile User"

def test_get_profile_unauthorized(client):
    response = client.get("/api/v1/auth/profile")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_token_refresh(client):
    # Register and Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "refresh@example.com", "password": "Password123!", "full_name": "Refresh User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "refresh@example.com", "password": "Password123!"}
    )
    refresh_token = login_res.json()["refresh_token"]
    
    # Refresh
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    
    # Try using old refresh token again (should fail due to rotation)
    response_retry = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert response_retry.status_code == status.HTTP_401_UNAUTHORIZED

def test_logout(client):
    # Register and Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "logout@example.com", "password": "Password123!", "full_name": "Logout User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "logout@example.com", "password": "Password123!"}
    )
    access_token = login_res.json()["access_token"]
    refresh_token = login_res.json()["refresh_token"]
    
    # Logout
    response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Refresh token should be revoked now
    refresh_retry = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_retry.status_code == status.HTTP_401_UNAUTHORIZED
