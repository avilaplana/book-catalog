from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from colophon.models import Book, UserBook


@dataclass(frozen=True)
class LibraryBook:
    google_books_id: str
    title: str
    author: str | None
    cover_url: str | None
    added_at: datetime


class BookAlreadyInLibrary(Exception):
    pass


class LibraryService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add_book(
        self,
        user_id: UUID,
        *,
        google_books_id: str,
        title: str,
        author: str | None,
        cover_url: str | None,
    ) -> LibraryBook:
        book_id = await self._upsert_book(
            google_books_id=google_books_id,
            title=title,
            author=author,
            cover_url=cover_url,
        )
        already_linked = await self._session.scalar(
            select(UserBook.id).where(
                UserBook.user_id == user_id, UserBook.book_id == book_id
            )
        )
        if already_linked is not None:
            raise BookAlreadyInLibrary

        link = UserBook(user_id=user_id, book_id=book_id)
        self._session.add(link)
        await self._session.flush()
        await self._session.refresh(link, attribute_names=["added_at"])
        return LibraryBook(
            google_books_id=google_books_id,
            title=title,
            author=author,
            cover_url=cover_url,
            added_at=link.added_at,
        )

    async def list_books(self, user_id: UUID) -> list[LibraryBook]:
        stmt = (
            select(Book, UserBook.added_at)
            .join(UserBook, UserBook.book_id == Book.id)
            .where(UserBook.user_id == user_id)
            .order_by(UserBook.added_at.desc())
        )
        rows = (await self._session.execute(stmt)).all()
        return [
            LibraryBook(
                google_books_id=book.google_books_id,
                title=book.title,
                author=book.author,
                cover_url=book.cover_url,
                added_at=added_at,
            )
            for book, added_at in rows
        ]

    async def _upsert_book(
        self,
        *,
        google_books_id: str,
        title: str,
        author: str | None,
        cover_url: str | None,
    ) -> UUID:
        stmt = (
            pg_insert(Book)
            .values(
                google_books_id=google_books_id,
                title=title,
                author=author,
                cover_url=cover_url,
            )
            .on_conflict_do_update(
                index_elements=[Book.google_books_id],
                set_={"title": title, "author": author, "cover_url": cover_url},
            )
            .returning(Book.id)
        )
        return (await self._session.execute(stmt)).scalar_one()
