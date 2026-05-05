# Slice 1 — Find and save a book

## Purpose

After this slice ships, a Colophon user can:

1. Authenticate with their Google account.
2. Search for a book by title or author (against the Google Books API).
3. Add a book to their personal Library.
4. View their Library.

That is the entire user-perceivable capability of Slice 1.

## In scope

**Authentication**
- Google Sign-In (OAuth 2.0) from the mobile app.
- After Google auth completes, mobile calls `POST /v1/auth/google` with the Google ID token; backend verifies it and returns a fresh access + refresh JWT pair.
- Mobile stores the refresh token in `expo-secure-store`; the access token is held in memory only.
- A 401 response on any call triggers one silent call to `POST /v1/auth/refresh` to rotate tokens, then retries the original request once. On refresh failure, the user is routed to the Login screen.

**Library screen (root)**
- On screen mount, mobile calls `GET /v1/library/books` and renders the response sorted by `added_at DESC`.
- When the screen is focused (initial mount or returning from Add via back/navigate), mobile re-fetches via `GET /v1/library/books`. Newly-added books appear at the top because the list is sorted by `added_at DESC`.
- Each row shows cover thumbnail, title, author. Rows are not tappable in this slice.
- Empty state: centred text "Your library is empty" with a primary "Find a book" button that pushes the Search screen.
- Header "+" appears once the Library has at least one book; tapping it pushes the Search screen.

**Search screen**
- Text input with ~300ms debounce.
- On each debounced query, mobile calls `GET /v1/books/search?q=...`. Backend proxies to Google Books and returns up to 20 results.
- Results render as a list of book rows (cover, title, author).
- Empty results show inline empty state: "No books found. Try a different title or author."

**Preview screen**
- Opened by tapping a search result; uses the data already returned by `GET /v1/books/search` (no additional API call).
- Shows cover, title, author, description.
- Single "Add" button.
- Back navigation returns to the Search screen with query and results state preserved.

**Add behaviour**
- Tapping "Add" calls `POST /v1/library/books` with `{google_books_id}`.
- Backend looks up `Book` by `google_books_id`; reuses if it exists, otherwise inserts a new `Book`.
- Backend inserts a `User Book` linking the current user to the `Book`.
- On success (201): mobile navigates to the Library screen; the new book appears at the top; toast confirms "Added to your library."
- On duplicate (409): mobile shows toast "Already in your library" and stays on the Preview screen.

**Navigation**
- React Navigation native stack only. No tab bar.
- Login → Library (root) → Search → Preview.
- Back navigation always returns to the previous screen; the user is never trapped.

**Error handling**

| Source | UX |
|---|---|
| Empty search results from `GET /v1/books/search` | Inline empty state: "No books found. Try a different title or author." |
| Network unreachable on any call | Toast: "Couldn't reach the server. Tap to retry." |
| 5xx on any call | Toast: "Something went wrong. Tap to retry." |
| 401 on any call | Silent `POST /v1/auth/refresh` + retry once; on failure, route to Login |
| 409 from `POST /v1/library/books` | Toast: "Already in your library." |

Backend logs all errors via `structlog`; observed via `fly logs`.

## Out of scope (deferred to later slices)

- ISBN barcode scanning
- Manual book entry (when Google Books has no match)
- Removing a book from the Library
- Book detail screen
- Reading status (`want_to_read` / `reading` / `read`)
- Shelves
- Editing book metadata, notes
- Settings screen, Logout, account deletion
- Tab bar navigation
- Pagination on the Library list
- Crash/error telemetry (Sentry)
- Apple Sign-In, email/password auth
- Push notifications, stats, analytics
- Offline mode, request queueing
- S3 cover hosting (we use Google Books thumbnail URLs directly)
- Rate limiting

## Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL.
- **Mobile**: React Native + Expo (TypeScript), React Navigation native stack, `expo-secure-store`.
- **Hosting**: Fly.io for the backend, Fly Postgres for the database.
- **CI**: GitHub Actions.
- **OTA updates**: EAS Update enabled.

## API surface (Slice 1 only)

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/auth/google` | Verify Google ID token; return access + refresh JWTs |
| POST | `/v1/auth/refresh` | Rotate refresh token; return new access + refresh JWTs |
| GET | `/v1/library/books` | List the user's Library, sorted `added_at DESC` (no pagination) |
| POST | `/v1/library/books` | Add a book; body `{google_books_id}`; 201 on success, 409 if already present |
| GET | `/v1/books/search?q=...` | Proxy to Google Books; up to 20 results |

All errors use RFC 7807 Problem Details format. All `/v1/library/...` routes require a valid access JWT.

## Data model (Slice 1 only)

A single Alembic migration creates these three tables. Future slices add columns or tables via their own migrations.

```
users
- id              UUID         PK
- google_sub      text         unique, not null
- email           text         not null
- display_name    text
- avatar_url      text
- created_at      timestamptz  not null, default now()

books
- id              UUID         PK
- google_books_id text         unique, not null
- title           text         not null
- author          text
- cover_url       text
- created_at      timestamptz  not null, default now()

user_books
- id              UUID         PK
- user_id         UUID         FK → users.id, not null, on delete cascade
- book_id         UUID         FK → books.id, not null
- added_at        timestamptz  not null, default now()
- UNIQUE (user_id, book_id)
```

Notes for future slices:
- `books.google_books_id` is `not null` in this slice. The manual-entry slice will alter it to nullable.
- `books.author` is a single string here. A future slice may normalise authors into their own table.

## Definition of done

- [ ] User can complete the full flow on a real device: open app → log in with Google → search → tap result → Add → see book at top of Library.
- [ ] Reopening the app skips login (refresh token works) and shows the populated Library.
- [ ] All `/v1/library/...` routes enforce JWT auth; unauthenticated requests return 401.
- [ ] Duplicate add returns 409; mobile shows the duplicate toast.
- [ ] Network and 5xx errors show a retry toast; tapping retries the last action.
- [ ] Empty search shows the inline empty state with no dead-end.
- [ ] Backend deployed to Fly.io; mobile builds and runs on iOS and Android via Expo.

## Reference

- Domain language: [`/CONTEXT.md`](../../CONTEXT.md)
