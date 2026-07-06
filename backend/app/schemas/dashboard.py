from pydantic import BaseModel
from typing import Dict, List, Optional

class ProjectCount(BaseModel):
    project_name: str
    count: int

class DeveloperPerformance(BaseModel):
    developer_name: str
    resolved_count: int
    assigned_count: int

class BugTrend(BaseModel):
    month: str
    count: int

class ActivityMin(BaseModel):
    id: int
    action: str
    details: Optional[str] = None
    created_at: str
    user_name: str

class DashboardResponse(BaseModel):
    total_bugs: int
    open_bugs: int
    closed_bugs: int
    critical_bugs: int
    high_priority_bugs: int
    assigned_to_me: int
    bugs_by_status: Dict[str, int]
    bugs_by_priority: Dict[str, int]
    bugs_per_project: List[ProjectCount]
    monthly_trends: List[BugTrend]
    developer_performance: List[DeveloperPerformance]
    recent_activities: List[ActivityMin] = []
