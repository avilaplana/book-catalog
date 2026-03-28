from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class StatusCounts(BaseModel):
    want_to_read: int
    currently_reading: int
    read: int

class ProfileResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    created_at: datetime
    total_books: int
    status_counts: StatusCounts
    shelf_count: int
