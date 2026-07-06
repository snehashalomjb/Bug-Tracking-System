from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List
from datetime import datetime, timedelta
from app.models.models import Bug, Project, User, Activity, Role, user_roles
from app.schemas.dashboard import DashboardResponse, ProjectCount, DeveloperPerformance, BugTrend, ActivityMin

class DashboardService:
    @staticmethod
    def get_dashboard_data(db: Session, current_user_id: int) -> DashboardResponse:
        # Simple counts
        total_bugs = db.query(Bug).count()
        open_bugs = db.query(Bug).filter(Bug.status != "Closed").count()
        closed_bugs = db.query(Bug).filter(Bug.status == "Closed").count()
        critical_bugs = db.query(Bug).filter(Bug.priority == "Critical").count()
        high_priority_bugs = db.query(Bug).filter(Bug.priority == "High").count()
        assigned_to_me = db.query(Bug).filter(Bug.assignee_id == current_user_id, Bug.status != "Closed").count()

        # Bugs by Status
        status_results = db.query(Bug.status, func.count(Bug.id)).group_by(Bug.status).all()
        bugs_by_status = {status: count for status, count in status_results}
        # Ensure all standard statuses are present in the response
        for std_status in ["New", "Open", "Assigned", "In Progress", "Testing", "Resolved", "Closed", "Reopened"]:
            if std_status not in bugs_by_status:
                bugs_by_status[std_status] = 0

        # Bugs by Priority
        priority_results = db.query(Bug.priority, func.count(Bug.id)).group_by(Bug.priority).all()
        bugs_by_priority = {priority: count for priority, count in priority_results}
        for std_priority in ["Low", "Medium", "High", "Critical"]:
            if std_priority not in bugs_by_priority:
                bugs_by_priority[std_priority] = 0

        # Bugs per Project
        project_results = db.query(Project.name, func.count(Bug.id)).outerjoin(Bug).group_by(Project.name).all()
        bugs_per_project = [ProjectCount(project_name=name, count=count) for name, count in project_results]

        # Monthly Bug Trends (last 6 months, database-agnostic via python grouping)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        recent_bugs = db.query(Bug.created_at).filter(Bug.created_at >= six_months_ago).all()
        
        trends_map: Dict[str, int] = {}
        # Pre-populate last 6 months in chronological order
        for i in range(5, -1, -1):
            month_date = datetime.utcnow() - timedelta(days=i*30)
            month_str = month_date.strftime("%Y-%m")
            trends_map[month_str] = 0
            
        for b in recent_bugs:
            month_str = b.created_at.strftime("%Y-%m")
            if month_str in trends_map:
                trends_map[month_str] += 1
                
        monthly_trends = [BugTrend(month=m, count=c) for m, c in sorted(trends_map.items())]

        # Developer Performance (resolved vs assigned open bugs)
        # Fetch users with role 'Developer'
        dev_role = db.query(Role).filter(Role.name == "Developer").first()
        devs_query = db.query(User)
        if dev_role:
            devs_query = devs_query.join(User.roles).filter(Role.id == dev_role.id)
        
        developers = devs_query.all()
        dev_performance: List[DeveloperPerformance] = []
        for dev in developers:
            resolved_count = db.query(Bug).filter(Bug.assignee_id == dev.id, Bug.status == "Resolved").count()
            assigned_count = db.query(Bug).filter(Bug.assignee_id == dev.id, Bug.status != "Closed", Bug.status != "Resolved").count()
            dev_performance.append(
                DeveloperPerformance(
                    developer_name=dev.full_name,
                    resolved_count=resolved_count,
                    assigned_count=assigned_count
                )
            )

        # Recent activities (last 5)
        recent_acts_db = db.query(Activity).order_by(Activity.created_at.desc()).limit(5).all()
        recent_activities = []
        for act in recent_acts_db:
            recent_activities.append(
                ActivityMin(
                    id=act.id,
                    action=act.action,
                    details=act.details,
                    created_at=act.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    user_name=act.user.full_name if act.user else "System"
                )
            )

        return DashboardResponse(
            total_bugs=total_bugs,
            open_bugs=open_bugs,
            closed_bugs=closed_bugs,
            critical_bugs=critical_bugs,
            high_priority_bugs=high_priority_bugs,
            assigned_to_me=assigned_to_me,
            bugs_by_status=bugs_by_status,
            bugs_by_priority=bugs_by_priority,
            bugs_per_project=bugs_per_project,
            monthly_trends=monthly_trends,
            developer_performance=dev_performance,
            recent_activities=recent_activities
        )
