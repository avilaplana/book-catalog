from fastapi import APIRouter, Depends
from pydantic import BaseModel

from colophon.dependencies import get_current_user, get_google_books_client
from colophon.google_books_client import BookSearchResult, GoogleBooksClient
from colophon.models import User


class BookSearchResultResponse(BaseModel):
    google_books_id: str
    title: str
    author: str | None
    cover_url: str | None
    description: str | None
    subtitle: str | None
    publisher: str | None
    published_date: str | None
    language: str | None
    page_count: int | None
    categories: str | None
    isbn_13: str | None
    isbn_10: str | None

    @classmethod
    def from_domain(cls, result: BookSearchResult) -> "BookSearchResultResponse":
        return cls(
            google_books_id=result.google_books_id,
            title=result.title,
            author=result.author,
            cover_url=result.cover_url,
            description=result.description,
            subtitle=result.subtitle,
            publisher=result.publisher,
            published_date=result.published_date,
            language=result.language,
            page_count=result.page_count,
            categories=result.categories,
            isbn_13=result.isbn_13,
            isbn_10=result.isbn_10,
        )


router = APIRouter(prefix="/v1/books")


@router.get("/search")
async def search_books(
    q: str = "",
    _user: User = Depends(get_current_user),
    client: GoogleBooksClient = Depends(get_google_books_client),
) -> list[BookSearchResultResponse]:
    results = await client.search(q)
    return [BookSearchResultResponse.from_domain(r) for r in results]
