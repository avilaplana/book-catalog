import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Book, UserBook, Shelf, ShelfBook, ReadingStatus
from app.schemas.catalog import (
    AddBookRequest, UpdateBookRequest, UserBookResponse,
    CreateShelfRequest, AddBookToShelfRequest, ShelfResponse,
)
from app.services.google_books import get_book_by_id

router = APIRouter(tags=["catalog"])

def _build_user_book_response(user_book: UserBook) -> dict:
    book = user_book.book
    return {
        "id": user_book.id,
        "book_id": book.id,
        "google_books_id": book.google_books_id,
        "isbn": book.isbn,
        "title": book.title,
        "authors": book.authors,
        "cover_url": book.cover_url,
        "publisher": book.publisher,
        "published_date": book.published_date,
        "status": user_book.status,
        "rating": user_book.rating,
        "notes": user_book.notes,
        "started_at": user_book.started_at,
        "finished_at": user_book.finished_at,
        "created_at": user_book.created_at,
        "shelves": [{"id": se.shelf.id, "name": se.shelf.name} for se in user_book.shelf_entries],
    }

@router.get("/catalog/books", response_model=list[UserBookResponse])
def list_catalog_books(
    status: Optional[ReadingStatus] = Query(None),
    shelf_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(UserBook).filter(UserBook.user_id == current_user.id)
    if status:
        query = query.filter(UserBook.status == status)
    if shelf_id:
        query = query.join(ShelfBook).filter(ShelfBook.shelf_id == shelf_id)
    return [_build_user_book_response(ub) for ub in query.all()]

@router.post("/catalog/books", response_model=UserBookResponse, status_code=201)
def add_book(
    request: AddBookRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if request.google_books_id:
        book = db.query(Book).filter(Book.google_books_id == request.google_books_id).first()
        if book is None:
            book_data = get_book_by_id(request.google_books_id)
            if book_data is None:
                raise HTTPException(status_code=404, detail="Book not found in Google Books")
            book = Book(**book_data)
            db.add(book)
            db.commit()
            db.refresh(book)
        existing = db.query(UserBook).filter(
            UserBook.user_id == current_user.id, UserBook.book_id == book.id
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Book already in catalog")
    else:
        if not request.title:
            raise HTTPException(status_code=422, detail="title is required for manual entry")
        book = Book(
            title=request.title, authors=request.authors, isbn=request.isbn,
            publisher=request.publisher, published_date=request.published_date,
            cover_url=request.cover_url,
        )
        db.add(book)
        db.commit()
        db.refresh(book)

    user_book = UserBook(user_id=current_user.id, book_id=book.id, status=request.status)
    db.add(user_book)
    db.commit()
    db.refresh(user_book)
    return _build_user_book_response(user_book)

@router.get("/catalog/books/{user_book_id}", response_model=UserBookResponse)
def get_catalog_book(
    user_book_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_book = db.query(UserBook).filter(
        UserBook.id == user_book_id, UserBook.user_id == current_user.id
    ).first()
    if user_book is None:
        raise HTTPException(status_code=404, detail="Book not found in catalog")
    return _build_user_book_response(user_book)

@router.patch("/catalog/books/{user_book_id}", response_model=UserBookResponse)
def update_catalog_book(
    user_book_id: uuid.UUID,
    request: UpdateBookRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_book = db.query(UserBook).filter(
        UserBook.id == user_book_id, UserBook.user_id == current_user.id
    ).first()
    if user_book is None:
        raise HTTPException(status_code=404, detail="Book not found in catalog")
    for field, value in request.model_dump(exclude_none=True).items():
        setattr(user_book, field, value)
    db.commit()
    db.refresh(user_book)
    return _build_user_book_response(user_book)

@router.delete("/catalog/books/{user_book_id}", status_code=204)
def delete_catalog_book(
    user_book_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_book = db.query(UserBook).filter(
        UserBook.id == user_book_id, UserBook.user_id == current_user.id
    ).first()
    if user_book is None:
        raise HTTPException(status_code=404, detail="Book not found in catalog")
    db.delete(user_book)
    db.commit()

@router.get("/catalog/shelves", response_model=list[ShelfResponse])
def list_shelves(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shelves = db.query(Shelf).filter(Shelf.user_id == current_user.id).all()
    return [{"id": s.id, "name": s.name, "book_count": len(s.shelf_books), "created_at": s.created_at} for s in shelves]

@router.post("/catalog/shelves", response_model=ShelfResponse, status_code=201)
def create_shelf(
    request: CreateShelfRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = Shelf(user_id=current_user.id, name=request.name)
    db.add(shelf)
    db.commit()
    db.refresh(shelf)
    return {"id": shelf.id, "name": shelf.name, "book_count": 0, "created_at": shelf.created_at}

@router.delete("/catalog/shelves/{shelf_id}", status_code=204)
def delete_shelf(
    shelf_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id, Shelf.user_id == current_user.id).first()
    if shelf is None:
        raise HTTPException(status_code=404, detail="Shelf not found")
    db.delete(shelf)
    db.commit()

@router.post("/catalog/shelves/{shelf_id}/books", status_code=201)
def add_book_to_shelf(
    shelf_id: uuid.UUID,
    request: AddBookToShelfRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id, Shelf.user_id == current_user.id).first()
    if shelf is None:
        raise HTTPException(status_code=404, detail="Shelf not found")
    user_book = db.query(UserBook).filter(
        UserBook.id == request.user_book_id, UserBook.user_id == current_user.id
    ).first()
    if user_book is None:
        raise HTTPException(status_code=404, detail="Book not found in catalog")
    existing = db.query(ShelfBook).filter(
        ShelfBook.shelf_id == shelf_id, ShelfBook.user_book_id == request.user_book_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Book already on this shelf")
    db.add(ShelfBook(shelf_id=shelf_id, user_book_id=request.user_book_id))
    db.commit()
    return {"shelf_id": str(shelf_id), "user_book_id": str(request.user_book_id)}

@router.delete("/catalog/shelves/{shelf_id}/books/{user_book_id}", status_code=204)
def remove_book_from_shelf(
    shelf_id: uuid.UUID,
    user_book_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id, Shelf.user_id == current_user.id).first()
    if shelf is None:
        raise HTTPException(status_code=404, detail="Shelf not found")
    shelf_book = db.query(ShelfBook).filter(
        ShelfBook.shelf_id == shelf_id, ShelfBook.user_book_id == user_book_id
    ).first()
    if shelf_book is None:
        raise HTTPException(status_code=404, detail="Book not on this shelf")
    db.delete(shelf_book)
    db.commit()
