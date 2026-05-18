# Slice 3 — Richer book details on Preview

## Purpose

After this slice ships, a Colophon user can:

1. Search or scan a book as before.
2. Tap a result and see *richer* book details on the Preview screen — subtitle, publisher, published date, page count, categories, language, and ISBN-13 — alongside the existing cover, title, author, and description.
3. Confirm a scanned barcode matches the book on screen by comparing the visible ISBN-13.
4. Add the book; the richer fields are persisted to the `books` row.

That is the entire user-perceivable capability of Slice 3. The Library list and rows are unchanged; rows are still not tappable. (A tappable Library → detail screen is the next slice.)

## Background

Slices 1 and 2 stored only a slim `Book` (title, author, cover URL) and only that minimal subset reached the user via search results. This slice expands the data flow end-to-end so the canonical Google Books `volumeInfo` is what users see on Preview and what the database stores after Add.

The slice is deliberately scoped to **the Preview surface and the persistence path**. The Library detail screen — making rows tappable, reading the richer `books` row, rendering it — is deferred to a follow-up slice so this one can ship with a smaller blast radius and a clean backend-then-mobile split.

## In scope

**Backend — `GET /v1/books/search`**
- `GoogleBooksClient._normalize` extracts new fields from `volumeInfo`:
  - `subtitle` (string)
  - `publisher` (string)
  - `publishedDate` → stored loosely as a string (Google Books returns either `"YYYY"` or `"YYYY-MM-DD"`; no parsing this slice)
  - `description` (string) — already extracted today, unchanged
  - `pageCount` (int)
  - `categories` (array) → joined with `", "`, mirroring the existing `author` pattern
  - `language` (string, ISO code)
  - `industryIdentifiers` → pick the first entry of type `ISBN_13` and the first of type `ISBN_10`
- `BookSearchResult` (dataclass) and `BookSearchResultResponse` (Pydantic) extended with the same fields. All fields nullable.
- Response shape stays a flat object per result.

**Backend — `POST /v1/library/books`**
- `AddBookRequest` gains: `subtitle`, `publisher`, `published_date`, `description`, `page_count`, `categories`, `language`, `isbn_10`, `isbn_13`. All optional, all default `None`.
- `LibraryService.add_book` accepts them and forwards to `_upsert_book`.
- `_upsert_book`'s `on_conflict_do_update` set includes the new columns, so existing Slice 1 `books` rows are **lazily enriched** the next time anyone adds a matching `google_books_id`. No separate backfill.

**Backend — schema**
- Single Alembic migration adds these nullable columns to `books`:

  ```
  + subtitle        text
  + publisher       text
  + published_date  text       -- stored as the loose string Google Books returns
  + description     text
  + page_count      integer
  + categories      text       -- comma-joined, mirrors `author`
  + language        text       -- ISO code
  + isbn_10         text
  + isbn_13         text
  ```

- All nullable; existing rows remain valid.

**Backend — compression**
- `app.add_middleware(GZipMiddleware, minimum_size=1000)` added to `colophon/app.py`. Standard HTTP gzip negotiated via `Accept-Encoding`; transparent to clients.

**Backend — domain doc**
- `CONTEXT.md` **ISBN** entry rewritten to acknowledge ISBN as `Book` metadata while keeping `google_books_id` as the canonical lookup key. New wording:

  > **ISBN**:
  > The 13-digit identifier printed as the barcode on a physical book (Bookland EAN-13, prefix `978`/`979`). Used to *find* a Book via Google Books (`q=isbn:…`); the canonical lookup key on `Book` remains `google_books_id`, not the ISBN. Stored on `Book` as metadata (both `isbn_13` and `isbn_10` when Google Books returns them) so the user can confirm a scanned barcode matches the book on screen.
  > _Avoid_: Barcode (the ISBN is the data; the barcode is just how it's printed); using ISBN as a primary identifier.

**Mobile — types**
- `BookSearchResult` TS type extended to mirror the backend response.

**Mobile — `PreviewScreen`**
- No fetch change. Data still arrives via nav params; no spinner, no loading state, no new error paths.
- New layout:
  - Cover (existing)
  - **Title** (existing)
  - **Subtitle** under the title in lighter weight — only when present
  - **Author(s)** (existing)
  - **Metadata line** — small grey text joining `publisher · published_date · page_count pages · language`, skipping null parts; the whole line is omitted if all parts are null
  - **Categories** — small comma-joined text — only when present
  - **ISBN** — line reading `ISBN: <isbn_13>` — only when `isbn_13` is present. `isbn_10` is persisted but not displayed.
  - **"Add to library"** button (existing)
  - **Description** below the button (existing position)
- Add button continues to call `POST /v1/library/books`, now with the full extended payload it received from the search result.

**Mobile — `Library` screen**
- Unchanged. Rows are still not tappable. Existing rendering is unaffected because `GET /v1/library/books` response shape is unchanged this slice.

## Out of scope (deferred)

- Library row tappable → Library detail screen — **next slice**.
- Reading the richer `books` row to render a detail view.
- A separate `GET /v1/books/{google_books_id}` endpoint — explicitly avoided; the search response is the single source of rich data on the read path.
- Backfill script for existing Slice 1 `books` rows — relying on lazy `_upsert_book` enrichment.
- ISBN-10 visibility on Preview — persisted, not displayed (it can't be matched against a scanned barcode).
- Parsing `published_date` into a real date type.
- Normalising `categories` into a child table.
- Manual ISBN entry, batch scanning, scan from Library — still deferred from Slice 2.
- Removing a book from the Library, reading status, shelves, settings, account deletion — still deferred from Slice 1.

## Stack additions

- **Backend**: `GZipMiddleware` (ships with FastAPI; no new dependency).
- **Mobile**: none.

## API surface

No new endpoints. Existing endpoints change additively.

| Method | Path | Change |
|---|---|---|
| GET | `/v1/books/search?q=...` | Response items gain `subtitle`, `publisher`, `published_date`, `page_count`, `categories`, `language`, `isbn_10`, `isbn_13`. `description` unchanged. |
| POST | `/v1/library/books` | Request body gains all of the above as optional fields. 201 / 409 semantics unchanged. |
| GET | `/v1/library/books` | Response shape **unchanged** this slice. The richer fields are stored but not yet returned to the Library list — that comes with the next slice. |

Responses above ~1KB are now gzip-compressed when the client sends `Accept-Encoding: gzip`. Standard HTTP behaviour; transparent to current mobile clients.

## Data model

Single Alembic migration adding the columns listed in **Backend — schema** above. All nullable. Existing rows remain valid. Slice 1 rows are enriched lazily: any subsequent `POST /v1/library/books` matching the same `google_books_id` updates the row via `_upsert_book`'s `on_conflict_do_update`.

## Error handling

No new error paths. Existing handling from Slice 1 applies unchanged (network / 5xx / 401 / 409 toasts).

If Google Books returns a `volumeInfo` missing one or more of the new fields, the backend yields `null` for that field; the mobile renderer collapses missing parts (no `publisher: null` rendered).

## Trust boundary

`POST /v1/library/books` continues to trust the client-supplied payload, same as Slice 1. After this slice the trusted surface is larger — a buggy or malicious client could write incorrect description / ISBN values into the shared `books` row that other users would see. Acceptable for a personal single-user app today; revisit before opening the app to other users.

## Issue split

Two issues, mobile blocked by backend:

1. **Backend**: migration + extended search + extended Add + `GZipMiddleware` + `CONTEXT.md` rewrite. Shippable independently — existing mobile keeps working because the response shape is additive.
2. **Mobile**: extended `BookSearchResult` TS type + new Preview layout. Blocked by backend.

## Definition of done

- [ ] Alembic migration applied; `books` table has all nine new columns, all nullable.
- [ ] `GET /v1/books/search` returns the new fields for known books (manual check with a book that has a publisher, page count, ISBN-13, and categories on Google Books).
- [ ] `POST /v1/library/books` accepts and persists the new fields; verified via a fresh add producing a fully-populated `books` row.
- [ ] An existing Slice 1 `books` row (with new columns NULL) is enriched after another Add by the same `google_books_id`.
- [ ] `Accept-Encoding: gzip` on a search request yields a `Content-Encoding: gzip` response.
- [ ] `CONTEXT.md` ISBN entry updated; schema and doc agree.
- [ ] `PreviewScreen` renders subtitle, metadata line, categories, ISBN-13, and description for a book that has them — and gracefully omits each missing piece for a sparse book.
- [ ] Scanning a barcode → tapping the result → Preview shows the ISBN-13 visibly matching the EAN-13 the camera read.
- [ ] Adding a book from Preview still puts it at the top of the Library with the existing "Added to your library." toast.
- [ ] Mobile builds and runs on iOS via the local dev build; backend deploys cleanly to Fly.

## Reference

- Slice 1: [`01-find-and-save-a-book.md`](./01-find-and-save-a-book.md)
- Slice 2: [`02-scan-isbn-to-add-a-book.md`](./02-scan-isbn-to-add-a-book.md)
- Domain language: [`/CONTEXT.md`](../../CONTEXT.md) — see the **Book** and **ISBN** terms
