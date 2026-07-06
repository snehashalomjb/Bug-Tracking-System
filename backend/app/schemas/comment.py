from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.project import UserMin

class CommentCreate(BaseModel):
    bug_id: int
    content: str = Field(..., min_length=1, description="Comment text content")

class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, description="Updated comment text content")

class CommentResponse(BaseModel):
    id: int
    bug_id: int
    user_id: int
    user: UserMin
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
