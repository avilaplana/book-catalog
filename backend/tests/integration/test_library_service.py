import pytest

from colophon.library_service import BookAlreadyInLibrary, LibraryService
from colophon.models import User

ULYSSES = dict(
    google_books_id="g-ulysses",
    title="Ulysses",
    author="James Joyce",
    cover_url="https://example.com/u.jpg",
)
DUBLINERS = dict(
    google_books_id="g-dubliners",
    title="Dubliners",
    author="James Joyce",
    cover_url=None,
)
LORD_OF_THE_RINGS_RICH = dict(
    google_books_id="g-lotr",
    title="The Lord of the Rings",
    author="J.R.R. Tolkien",
    cover_url="https://example.com/lotr.jpg",
    subtitle="One Volume Edition",
    publisher="HarperCollins",
    published_date="2005-10-25",
    description="An epic high-fantasy novel.",
    page_count=1216,
    categories="Fiction, Fantasy",
    language="en",
    isbn_13="9780261103573",
    isbn_10="0261103571",
)


async def _seed_user(db_session, sub: str = "u-1") -> User:
    user = User(
        google_sub=sub, email=f"{sub}@example.com", display_name=None, avatar_url=None
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def test_add_book_returns_the_added_book(db_session):
    service = LibraryService(db_session)
    user = await _seed_user(db_session)

    added = await service.add_book(user.id, **ULYSSES)

    assert added.google_books_id == "g-ulysses"
    assert added.title == "Ulysses"
    assert added.author == "James Joyce"
    assert added.cover_url == "https://example.com/u.jpg"
    assert added.added_at is not None


async def test_list_books_is_empty_for_a_user_with_no_books(db_session):
    service = LibraryService(db_session)
    user = await _seed_user(db_session)

    assert await service.list_books(user.id) == []


async def test_list_books_returns_added_books_newest_first(db_session):
    service = LibraryService(db_session)
    user = await _seed_user(db_session)

    await service.add_book(user.id, **ULYSSES)
    await db_session.commit()
    await service.add_book(user.id, **DUBLINERS)
    await db_session.commit()

    titles = [b.title for b in await service.list_books(user.id)]
    assert titles == ["Dubliners", "Ulysses"]


async def test_list_books_is_scoped_per_user(db_session):
    service = LibraryService(db_session)
    alice = await _seed_user(db_session, "alice")
    bob = await _seed_user(db_session, "bob")

    await service.add_book(alice.id, **ULYSSES)

    assert await service.list_books(bob.id) == []
    assert [b.title for b in await service.list_books(alice.id)] == ["Ulysses"]


async def test_adding_the_same_book_twice_raises(db_session):
    service = LibraryService(db_session)
    user = await _seed_user(db_session)

    await service.add_book(user.id, **ULYSSES)

    with pytest.raises(BookAlreadyInLibrary):
        await service.add_book(user.id, **ULYSSES)


async def test_two_users_can_add_the_same_book(db_session):
    service = LibraryService(db_session)
    alice = await _seed_user(db_session, "alice")
    bob = await _seed_user(db_session, "bob")

    await service.add_book(alice.id, **ULYSSES)
    await service.add_book(bob.id, **ULYSSES)

    assert [b.title for b in await service.list_books(bob.id)] == ["Ulysses"]


async def test_add_book_returns_rich_fields_when_provided(db_session):
    service = LibraryService(db_session)
    user = await _seed_user(db_session)

    added = await service.add_book(user.id, **LORD_OF_THE_RINGS_RICH)

    assert added.subtitle == "One Volume Edition"
    assert added.publisher == "HarperCollins"
    assert added.published_date == "2005-10-25"
    assert added.description == "An epic high-fantasy novel."
    assert added.page_count == 1216
    assert added.categories == "Fiction, Fantasy"
    assert added.language == "en"
    assert added.isbn_13 == "9780261103573"
    assert added.isbn_10 == "0261103571"


async def test_re_adding_same_google_books_id_enriches_rich_fields(db_session):
    """A pre-feature row (added with only the slim fields) gains the rich
    fields when a second user adds the same google_books_id with them."""
    from sqlalchemy import select

    from colophon.models import Book

    service = LibraryService(db_session)
    alice = await _seed_user(db_session, "alice")
    bob = await _seed_user(db_session, "bob")

    slim = dict(
        google_books_id="g-lotr",
        title="The Lord of the Rings",
        author="J.R.R. Tolkien",
        cover_url="https://example.com/lotr.jpg",
    )
    await service.add_book(alice.id, **slim)
    await db_session.flush()
    pre = (
        await db_session.execute(select(Book).where(Book.google_books_id == "g-lotr"))
    ).scalar_one()
    assert pre.subtitle is None
    assert pre.publisher is None
    assert pre.isbn_13 is None

    await service.add_book(bob.id, **LORD_OF_THE_RINGS_RICH)
    await db_session.flush()
    db_session.expire_all()
    after = (
        await db_session.execute(select(Book).where(Book.google_books_id == "g-lotr"))
    ).scalar_one()
    assert after.subtitle == "One Volume Edition"
    assert after.publisher == "HarperCollins"
    assert after.published_date == "2005-10-25"
    assert after.description == "An epic high-fantasy novel."
    assert after.page_count == 1216
    assert after.categories == "Fiction, Fantasy"
    assert after.language == "en"
    assert after.isbn_13 == "9780261103573"
    assert after.isbn_10 == "0261103571"
