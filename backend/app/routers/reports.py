from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database.session import get_db
from app.services.report_service import ReportService
from app.routers.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("")
def get_report(
    format: str = Query(..., description="Export format: 'excel' or 'pdf'"),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    severity: Optional[str] = None,
    project_id: Optional[int] = None,
    assignee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate and download bug reports filtered by priority, severity, project, assignee, or status."""
    bugs = ReportService.get_filtered_bugs(
        db,
        status=status_filter,
        priority=priority,
        severity=severity,
        project_id=project_id,
        assignee_id=assignee_id
    )

    format_lower = format.lower()
    if format_lower == "excel":
        content = ReportService.generate_excel_report(bugs)
        filename = "bugs_report.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif format_lower == "pdf":
        title_text = "Bug Tracking System Summary Report"
        content = ReportService.generate_pdf_report(bugs, title_text)
        filename = "bugs_report.pdf"
        media_type = "application/pdf"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Only 'excel' or 'pdf' are supported."
        )

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
