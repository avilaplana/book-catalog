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
    subtitle: str | None = None
    publisher: str | None = None
    published_date: str | None = None
    description: str | None = None
    page_count: int | None = None
    categories: str | None = None
    language: str | None = None
    isbn_13: str | None = None
    isbn_10: str | None = None


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
        subtitle: str | None = None,
        publisher: str | None = None,
        published_date: str | None = None,
        description: str | None = None,
        page_count: int | None = None,
        categories: str | None = None,
        language: str | None = None,
        isbn_13: str | None = None,
        isbn_10: str | None = None,
    ) -> LibraryBook:
        book_id = await self._upsert_book(
            google_books_id=google_books_id,
            title=title,
            author=author,
            cover_url=cover_url,
            subtitle=subtitle,
            publisher=publisher,
            published_date=published_date,
            description=description,
            page_count=page_count,
            categories=categories,
            language=language,
            isbn_13=isbn_13,
            isbn_10=isbn_10,
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
            subtitle=subtitle,
            publisher=publisher,
            published_date=published_date,
            description=description,
            page_count=page_count,
            categories=categories,
            language=language,
            isbn_13=isbn_13,
            isbn_10=isbn_10,
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
        subtitle: str | None,
        publisher: str | None,
        published_date: str | None,
        description: str | None,
        page_count: int | None,
        categories: str | None,
        language: str | None,
        isbn_13: str | None,
        isbn_10: str | None,
    ) -> UUID:
        values = {
            "google_books_id": google_books_id,
            "title": title,
            "author": author,
            "cover_url": cover_url,
            "subtitle": subtitle,
            "publisher": publisher,
            "published_date": published_date,
            "description": description,
            "page_count": page_count,
            "categories": categories,
            "language": language,
            "isbn_13": isbn_13,
            "isbn_10": isbn_10,
        }
        set_ = {k: v for k, v in values.items() if k != "google_books_id"}
        stmt = (
            pg_insert(Book)
            .values(**values)
            .on_conflict_do_update(
                index_elements=[Book.google_books_id],
                set_=set_,
            )
            .returning(Book.id)
        )
        return (await self._session.execute(stmt)).scalar_one()
