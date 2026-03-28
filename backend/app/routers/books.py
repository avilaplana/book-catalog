from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_current_user
from app.models import User
from app.schemas.book import BookSearchResult
from app.services.google_books import search_books, lookup_isbn

router = APIRouter(tags=["books"])

@router.get("/books/search", response_model=list[BookSearchResult])
def search(q: str = Query(..., min_length=1), current_user: User = Depends(get_current_user)):
    return search_books(q)

@router.get("/books/isbn/{isbn}", response_model=BookSearchResult)
def get_by_isbn(isbn: str, current_user: User = Depends(get_current_user)):
    result = lookup_isbn(isbn)
    if result is None:
        raise HTTPException(status_code=404, detail="Book not found for this ISBN")
    return result
