from fastapi import status
from tests.test_users_projects import get_auth_headers

def test_get_dashboard_data_success(client, db):
    headers = get_auth_headers(client, "admin_dash@example.com", "Admin", db)
    
    # Fetch dashboard data
    response = client.get("/api/v1/dashboard", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total_bugs" in data
    assert "open_bugs" in data
    assert "bugs_by_status" in data
    assert "bugs_by_priority" in data
    assert "bugs_per_project" in data
    assert "monthly_trends" in data
    assert "developer_performance" in data

def test_export_report_excel_success(client, db):
    headers = get_auth_headers(client, "admin_dash2@example.com", "Admin", db)
    
    # Export excel
    response = client.get("/api/v1/reports?format=excel", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "bugs_report.xlsx" in response.headers["content-disposition"]
    assert len(response.content) > 0

def test_export_report_pdf_success(client, db):
    headers = get_auth_headers(client, "admin_dash3@example.com", "Admin", db)
    
    # Export pdf
    response = client.get("/api/v1/reports?format=pdf", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["content-type"] == "application/pdf"
    assert "bugs_report.pdf" in response.headers["content-disposition"]
    assert len(response.content) > 0

def test_export_report_invalid_format(client, db):
    headers = get_auth_headers(client, "admin_dash4@example.com", "Admin", db)
    
    response = client.get("/api/v1/reports?format=csv_wrong", headers=headers)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "only 'excel' or 'pdf' are supported" in response.json()["detail"].lower()
