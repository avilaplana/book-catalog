from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models import ReadingStatus

class AddBookRequest(BaseModel):
    google_books_id: Optional[str] = None
    status: ReadingStatus
    # Manual entry fields — required when google_books_id is None
    title: Optional[str] = None
    authors: Optional[list[str]] = None
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    cover_url: Optional[str] = None

class UpdateBookRequest(BaseModel):
    status: Optional[ReadingStatus] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

class ShelfSummary(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}

class UserBookResponse(BaseModel):
    id: UUID
    book_id: UUID
    google_books_id: Optional[str] = None
    isbn: Optional[str] = None
    title: str
    authors: Optional[list[str]] = None
    cover_url: Optional[str] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    status: ReadingStatus
    rating: Optional[int] = None
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime
    shelves: list[ShelfSummary] = []
    model_config = {"from_attributes": True}

class CreateShelfRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class AddBookToShelfRequest(BaseModel):
    user_book_id: UUID

class ShelfResponse(BaseModel):
    id: UUID
    name: str
    book_count: int
    created_at: datetime
    model_config = {"from_attributes": True}
