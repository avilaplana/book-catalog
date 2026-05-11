import pytest
from sqlalchemy.exc import IntegrityError

from colophon.models import Book, User, UserBook


async def _seed_user_and_book(db_session) -> tuple[User, Book]:
    user = User(
        google_sub="u-1",
        email="alice@example.com",
        display_name=None,
        avatar_url=None,
    )
    book = Book(
        google_books_id="g-1",
        title="Ulysses",
        author="James Joyce",
        cover_url=None,
    )
    db_session.add_all([user, book])
    await db_session.flush()
    return user, book


async def test_user_book_links_a_user_and_a_book(db_session):
    user, book = await _seed_user_and_book(db_session)

    link = UserBook(user_id=user.id, book_id=book.id)
    db_session.add(link)
    await db_session.flush()

    fetched = await db_session.get(UserBook, link.id)
    assert fetched is not None
    assert fetched.user_id == user.id
    assert fetched.book_id == book.id

    await db_session.refresh(fetched)
    assert fetched.added_at is not None


async def test_user_cannot_add_the_same_book_twice(db_session):
    user, book = await _seed_user_and_book(db_session)

    db_session.add(UserBook(user_id=user.id, book_id=book.id))
    await db_session.flush()

    db_session.add(UserBook(user_id=user.id, book_id=book.id))
    with pytest.raises(IntegrityError):
        await db_session.flush()
