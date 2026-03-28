# Book Catalog App — Design Spec
**Date:** 2026-03-28

## Overview

A cross-platform mobile application (React Native + Expo) that allows users to catalog their personal book collection. Users sign in with Google, add books by scanning ISBNs or searching by title/author, assign reading statuses, organise books into custom shelves, write private notes, and rate books.

Social features (follow friends, activity feed) are explicitly out of scope for MVP but the data model is designed to support them later without structural changes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native (TypeScript) + Expo |
| Navigation | React Navigation (bottom tabs + nested stacks) |
| Server state | React Query |
| Local UI state | Zustand |
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| Authentication | Google Sign-In (OAuth2) + app-issued JWT |
| Book metadata | Google Books API |
| Book covers | Google Books thumbnail URLs (stored in DB) |

S3 for cover image storage is deferred to post-MVP.

---

## Authentication Flow

1. User taps "Sign in with Google" → Google's native consent screen opens via `@react-native-google-signin/google-signin`
2. Google returns a **Google ID Token** (signed JWT) to the app
3. App sends the ID Token to `POST /v1/auth/google`
4. Python verifies the token using the `google-auth` library (Google's public keys — no secrets needed)
5. Python extracts `email` and `google_user_id`, creates or finds the user in Postgres
6. Python issues its own **App JWT** (signed with server secret, expires in 1 hour) and returns it in the response body
7. App saves the App JWT to device **SecureStore** (encrypted at rest)
8. All subsequent API requests include `Authorization: Bearer <token>`

### JWT Expiry Handling

- Every API response passes through an HTTP interceptor in the app
- On `401 Unauthorized`, the interceptor silently asks Google for a fresh ID Token (no UI shown)
- It sends the fresh ID Token to `POST /v1/auth/google` to obtain a new App JWT
- The new JWT is saved to SecureStore and the original request is retried automatically
- If multiple requests fail simultaneously, the interceptor refreshes only once and retries all of them
- If Google's silent refresh fails (access revoked, account deleted), the app clears SecureStore and redirects to the login screen

---

## Data Model (PostgreSQL)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| google_id | text unique | From Google ID Token |
| email | text unique | |
| display_name | text | |
| avatar_url | text nullable | |
| created_at | timestamptz | |

### `books`
Shared metadata cache — one row per book regardless of how many users have it.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| google_books_id | text unique | |
| isbn | text nullable | ISBN-10 or ISBN-13 |
| title | text | |
| authors | text[] | |
| description | text nullable | |
| cover_url | text nullable | Google Books thumbnail URL |
| page_count | int nullable | |
| published_date | text nullable | |
| publisher | text nullable | Helps identify the edition |

### `user_books`
A user's personal catalog entry for a book — holds all personal data.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| book_id | uuid FK → books | |
| status | enum | `want_to_read`, `currently_reading`, `read` |
| rating | int nullable | 1–5 stars |
| notes | text nullable | Private, never shared |
| started_at | timestamptz nullable | |
| finished_at | timestamptz nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `shelves`
User-created collections for grouping books (like tags).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| name | text | e.g. "Dystopian Stories", "Summer reads" |
| created_at | timestamptz | |

### `shelf_books`
Junction table — a `user_book` can belong to 0 or many shelves.

| Column | Type | Notes |
|---|---|---|
| shelf_id | uuid FK → shelves | |
| user_book_id | uuid FK → user_books | |
| added_at | timestamptz | |
| **PK** | (shelf_id, user_book_id) | |

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>` except `/v1/auth/google`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/v1/auth/google` | Verify Google ID Token, return App JWT. Creates user on first login. |

### Books — metadata & discovery
| Method | Path | Description |
|---|---|---|
| GET | `/v1/books/search?q=` | Search by title or author via Google Books API. |
| GET | `/v1/books/isbn/{isbn}` | Look up a book by ISBN (from barcode scan). Checks Postgres cache first; calls Google Books only on cache miss. |

### Catalog — user's books
| Method | Path | Description |
|---|---|---|
| GET | `/v1/catalog/books` | List all catalog entries. Supports `?status=` and `?shelf_id=` filters. |
| POST | `/v1/catalog/books` | Add a book. Pass `google_books_id` and `status`. Creates `books` row if new. |
| GET | `/v1/catalog/books/{id}` | Full detail: book metadata + status, rating, notes, shelves. |
| PATCH | `/v1/catalog/books/{id}` | Update status, rating, notes, started_at, finished_at. |
| DELETE | `/v1/catalog/books/{id}` | Remove from catalog (also removes from all shelves). |

### Catalog — shelves
| Method | Path | Description |
|---|---|---|
| GET | `/v1/catalog/shelves` | List shelves with book counts. |
| POST | `/v1/catalog/shelves` | Create a shelf. |
| DELETE | `/v1/catalog/shelves/{id}` | Delete shelf. Books remain in catalog. |
| POST | `/v1/catalog/shelves/{id}/books` | Add a `user_book` to a shelf. |
| DELETE | `/v1/catalog/shelves/{id}/books/{user_book_id}` | Remove a book from a shelf. |

### Profile
| Method | Path | Description |
|---|---|---|
| GET | `/v1/profile` | Profile + reading stats (total books, per-status counts, shelf count). |

---

## ISBN Scan Flow

1. User taps "Scan" → camera opens via `expo-barcode-scanner`
2. Camera detects barcode → SDK returns the ISBN number
3. App calls `GET /v1/books/isbn/{isbn}`
4. API checks Postgres: if book exists, returns cached metadata immediately
5. If not found, API calls Google Books API (`volumes?q=isbn:{isbn}`), saves result to `books` table, returns metadata
6. App displays a preview (cover, title, author) for user confirmation
7. User selects a status and taps "Add to catalog"
8. App calls `POST /v1/catalog/books` with `google_books_id` and `status`
9. Book appears in the Library tab

### Edge Cases

**Case 1 — ISBN scanned but not found in Google Books:**
1. API returns `404` for the ISBN
2. App shows: "Book not found by ISBN — search by title/author"
3. User types title/author → `GET /v1/books/search?q=` → list of editions returned
4. User picks the matching edition → normal flow continues from step 6 above

**Case 2 — Book has no ISBN:**
- The user does not use the scanner at all
- They go directly to the Discover tab and search by title/author
- Same flow as Case 1 from step 3 onwards

**Case 3 — Book not found by title/author either (last resort):**
- Google Books returns no results
- App offers manual entry: user types title, authors, publisher, published_date
- All other fields (cover, description, page_count) are left blank
- App calls `POST /v1/catalog/books` with the manually entered fields directly (no `google_books_id`)

---

## App Navigation

Bottom tab navigator with 4 tabs:

| Tab | Screens |
|---|---|
| 📚 Library | Status tabs (Want to Read / Currently Reading / Read) → book grid → Book detail. Shelves accessible as a filter within the same screen. |
| 🔍 Discover | Search (title/author) + ISBN scanner → Book preview → "Add to catalog" (pick status) |
| ➕ Add | Quick-add sheet: scan / search / manual entry |
| 👤 Profile | Reading stats + settings + sign out |

---

## Local Storage (Mobile)

| Store | What | Why |
|---|---|---|
| SecureStore | App JWT | Encrypted at rest, used on every API request |
| React Query cache | API responses (books, shelves, profile) | In-memory only; wiped on app close. Makes navigation instant. |

The app has no local database and no offline mode in MVP. Users without internet see cached data from the current session but cannot add or modify books.

---

## Error Handling

### API (FastAPI)
All errors return: `{ "error": "message", "code": "ERROR_CODE" }`

| Code | Scenario |
|---|---|
| 401 | Missing or expired JWT |
| 404 | Book or shelf not found |
| 422 | Invalid request body — handled automatically by FastAPI/Pydantic |
| 503 | Google Books API unavailable |

### App (React Native)
- `401` → JWT refresh flow (see Authentication section)
- `503` from book search/scan → "Search unavailable, try adding manually"
- Network error → toast: "Something went wrong, please try again"
- ISBN not found in Google Books → "Book not found by ISBN — search by title/author" (see ISBN Scan Flow edge cases)
- Camera permission denied → prompt explaining why camera access is needed

---

## Post-MVP (Social Layer)

The following features are out of scope for MVP but the data model supports them without structural changes:

- Follow / unfollow users
- Activity feed (added to shelf, started reading, finished)
- Public profiles
- Apple Sign-In (same auth flow as Google)
- S3 for custom book cover uploads
