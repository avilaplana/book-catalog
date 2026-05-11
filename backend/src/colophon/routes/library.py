from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from colophon.dependencies import get_current_user, get_session
from colophon.library_service import LibraryBook, LibraryService
from colophon.models import User


class AddBookRequest(BaseModel):
    google_books_id: str
    title: str
    author: str | None = None
    cover_url: str | None = None


class LibraryBookResponse(BaseModel):
    google_books_id: str
    title: str
    author: str | None
    cover_url: str | None
    added_at: datetime

    @classmethod
    def from_domain(cls, book: LibraryBook) -> "LibraryBookResponse":
        return cls(
            google_books_id=book.google_books_id,
            title=book.title,
            author=book.author,
            cover_url=book.cover_url,
            added_at=book.added_at,
        )


router = APIRouter(prefix="/v1/library")


@router.get("/books")
async def list_books(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[LibraryBookResponse]:
    service = LibraryService(session)
    books = await service.list_books(user.id)
    return [LibraryBookResponse.from_domain(book) for book in books]


@router.post("/books", status_code=201)
async def add_book(
    body: AddBookRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> LibraryBookResponse:
    service = LibraryService(session)
    added = await service.add_book(
        user.id,
        google_books_id=body.google_books_id,
        title=body.title,
        author=body.author,
        cover_url=body.cover_url,
    )
    await session.commit()
    return LibraryBookResponse.from_domain(added)
