from pydantic import BaseModel
from typing import Optional

class BookSearchResult(BaseModel):
    google_books_id: str
    isbn: Optional[str] = None
    title: str
    authors: Optional[list[str]] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    page_count: Optional[int] = None
    published_date: Optional[str] = None
    publisher: Optional[str] = None
