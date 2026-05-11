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
