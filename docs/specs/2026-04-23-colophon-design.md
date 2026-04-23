# Colophon — Design Spec

- **Date:** 2026-04-23
- **Status:** Approved for implementation
- **Author:** Alvaro Vilaplana Garcia (design grill with Claude)

## 1. Product Overview

Colophon is a personal book-catalog mobile app. Each user signs in with Google and maintains a private library: books they own or want, organized by reading status and user-created shelves, with personal ratings and notes.

- **App name:** Colophon
- **Bundle ID / Android package:** `com.avg.colophon`
- **Suggested domain:** `colophon.app`
- **Target platforms:** iOS, Android (no web for MVP)

## 2. Scope

### In MVP
- Google OAuth2 sign-in.
- Add books via: text search (Google Books), ISBN barcode scan, manual entry.
- Per-book: reading status, rating, markdown notes, started/finished dates, shelves.
- User-created shelves (max 10 per user), with optional first-launch seeding.
- Library browsing with filter, sort, and server-side text search.
- Account deletion (hard delete).
- Basic crash reporting and structured server logs.

### Deferred post-MVP
- Apple Sign-In (required before iOS store launch — must add before first App Store submission).
- Email/password auth, other OAuth providers.
- Push notifications.
- Stats / insights screen.
- Data export.
- Re-read history, reading progress.
- S3-hosted cover images.
- Cursor pagination.
- Offline mutation queue, disk cache.
- Rate limiting.
- Axiom log aggregation.
- Staging environment.
- Force-update strategy.
- Product analytics SDK.
- i18n / localization.
- Multi-shelf filters, rating-range filter, full-text search of notes.

## 3. Technical Stack

### Backend
- Python 3.12, FastAPI
- PostgreSQL (latest supported major), SQLAlchemy 2.0, Alembic for migrations
- `structlog` for JSON logging with request_id middleware
- Sentry for exception capture
- Hosted on Fly.io (app) + Fly Postgres (DB)
- CI/CD via GitHub Actions

### Mobile
- React Native via Expo (TypeScript)
- React Query for server state + in-memory session cache
- `expo-secure-store` for refresh-token persistence
- `expo-camera` for ISBN barcode scanning
- Sentry (`sentry-expo`) for crash reporting
- EAS Build (binaries) + EAS Update (OTA updates)

### Repository
- Monorepo: `backend/` and `mobile/` side by side.
- GitHub Actions workflows path-filtered so each service's CI runs only on its own changes.

### Environments
- Local dev + production only. No staging for MVP.

## 4. Authentication

### Flow
1. Mobile app performs Google Sign-In via Expo's auth proxy → receives a Google ID token.
2. App sends the ID token once to `POST /v1/auth/google`.
3. Backend verifies the ID token using Google's public keys, upserts a `users` row keyed by `google_sub`, returns `{access_token, refresh_token}`.
4. App stores `refresh_token` in `expo-secure-store`, keeps `access_token` in memory.
5. All subsequent requests use the app-issued access token in the `Authorization` header.

### Token lifetimes
- **Access token:** JWT, 1 hour, signed with server-side secret.
- **Refresh token:** opaque, 30 days, rotating — each refresh issues a new refresh token and revokes the previous.

### On 401
- Attempt token refresh once via `POST /v1/auth/refresh`.
- On refresh success: retry the original request silently.
- On refresh failure (401): clear tokens, return to Google Sign-In screen. Show a one-time toast if the user was mid-action, no toast on cold start.
- On refresh failure (network error, not 401): keep tokens, show "No connection" state instead of signing out.

### Stored user data
Columns on `users`:
- `id` — uuid PK
- `google_sub` — text, unique, primary lookup key
- `email` — citext, unique
- `display_name` — text, nullable
- `avatar_url` — text, nullable
- `created_at`, `updated_at` — timestamptz

No Google access/refresh tokens are stored — the backend only verifies the ID token at login and does not call Google APIs as the user afterward.

## 5. Data Model

### `users`
As above.

### `books` (shared catalog)
One canonical row per book, shared across users.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| google_books_id | text, nullable | unique index |
| isbn_13 | text, nullable | unique index |
| title | text | required |
| authors | text[] | |
| publisher | text, nullable | |
| published_year | int, nullable | |
| description | text, nullable | |
| cover_image_url | text, nullable | Google Books thumbnail URL |
| created_at | timestamptz | |

- Manually entered books have `google_books_id` and `isbn_13` both null and get a fresh UUID; they do not dedupe with other users' manual entries (accepted MVP trade-off).
- `(google_books_id)` and `(isbn_13)` are each unique — upserts on add use `ON CONFLICT` to reuse canonical rows.

### `user_books` (per-user state)
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users, cascade delete |
| book_id | uuid | FK → books |
| status | enum | `want_to_read` / `reading` / `read` |
| rating | int, nullable | 1..5 |
| notes | text, nullable | markdown, soft-cap ~10k chars client-side |
| added_at | timestamptz | auto-set on insert |
| started_at | timestamptz, nullable | auto-set on `→ reading` transition |
| finished_at | timestamptz, nullable | auto-set on `→ read` transition, overwritten on re-reads |

- Unique constraint on `(user_id, book_id)`.
- Dates auto-set on forward status transitions as a convenience default; never auto-wiped on reversal. Both are editable.
- `started_at` stays null if user skips `reading` and goes directly to `read`.

### `shelves`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users, cascade delete |
| name | text | |
| created_at | timestamptz | |

- Unique constraint on `(user_id, name)`.
- Enforced cap: max 10 shelves per user (server-side on create → 409 on violation).

### `book_shelves`
Join table for many-to-many between `user_books` and `shelves`.

| Column | Type | Notes |
|---|---|---|
| user_book_id | uuid | FK → user_books |
| shelf_id | uuid | FK → shelves |

- Composite PK on `(user_book_id, shelf_id)`.
- Deleting a shelf removes these join rows; books in the library stay untouched.

## 6. API Design

### Conventions
- Base path: `/v1`. User-scoped routes live under `/v1/catalog/` (not `/v1/me/`).
- Authentication: `Authorization: Bearer <access_token>`.
- Error format: RFC 7807 Problem Details (`type`, `title`, `status`, `detail`, and optional `errors[]` for validation).
- Pagination: offset-based. Library page size 50, external search page size 20. Responses include `total`.

### Endpoints
- `POST /v1/auth/google` — exchange Google ID token for `{access_token, refresh_token}`.
- `POST /v1/auth/refresh` — rotate tokens.
- `POST /v1/auth/logout` — revoke current refresh token.
- `DELETE /v1/account` — hard-delete user and cascade data.

- `GET /v1/catalog/search?q=…&offset=0&limit=20` — text search via backend → Google Books. Always external.
- `GET /v1/catalog/books/by-isbn/:isbn` — local-first lookup; falls back to Google Books on miss and persists result into `books`.
- `GET /v1/catalog/books?status=…&shelf_id=…&search=…&sort=…&order=…&offset=0&limit=50` — the user's library. Text search is server-side via `ILIKE` over title/author.
- `POST /v1/catalog/books` — add a book to the library. Upserts into `books`, creates `user_books`. Returns existing row on duplicate instead of 409.
- `GET /v1/catalog/books/:user_book_id` — full book detail.
- `PATCH /v1/catalog/books/:user_book_id` — update status, rating, notes, dates, or shelves.
- `DELETE /v1/catalog/books/:user_book_id` — remove from library (hard delete of `user_books` + `book_shelves`).

- `GET /v1/catalog/shelves` — list the user's shelves with counts.
- `POST /v1/catalog/shelves` — create; 409 if at the 10-shelf cap.
- `PATCH /v1/catalog/shelves/:id` — rename.
- `DELETE /v1/catalog/shelves/:id` — delete shelf and its joins.

## 7. Mobile UX

### Navigation
Three bottom tabs:
1. **Library** (default) — filter by status / shelf, sort options, text search bar, and a `+` icon in the header.
2. **Shelves** — vertical list of shelves with book counts and a trailing stack of up to 3 cover thumbnails per row.
3. **Settings** — account info, theme, about, delete account.

### Add-book flow
- Entry point: the header `+` on Library (or the "Add a book" CTA on empty state).
- Tapping opens a bottom sheet with three rows: **Search**, **Scan ISBN**, **Enter manually**.
- Search → results screen (300ms debounce, 2-char minimum, skeleton loading, infinite scroll at 20/page). Tapping a result → preview screen.
- Scan → full-screen camera view with a viewfinder overlay. On successful scan → preview screen populated by ISBN lookup. Haptic feedback on scan (plus a soft sound on iOS only).
- Manual → form with title required; authors, ISBN-13, publisher, published year, cover URL optional.
- Preview screen shows cover, title, authors, description, and three status buttons (`Want to read` / `Reading` / `Read`). Tapping adds with that status.
- Books already in the user's library are badged "In library" in search results; tapping one goes to the book's detail screen rather than the preview/add flow.

### Book detail
- Cover + title + authors + publisher · year header.
- Status row (three-segment selector).
- Rating row (5 tappable stars, re-tap to clear).
- Shelves row (chips; `+` chip opens a multi-select picker).
- Notes (markdown rendered, edit in full-screen modal).
- Dates (added, started, finished — each editable via date picker).
- Description (collapsed with "Read more").
- Remove from library at the bottom (hard delete with confirm dialog).
- ISBN and Google Books ID in a metadata footer.

### Shelves
- Tab shows a vertical list of shelves with name, book count, and trailing cover thumbnails.
- Header `+` to create; inline text-field dialog; 409 from backend → toast "Max 10 shelves — remove one to add another."
- Tapping a shelf row → a shelf detail screen (same layout as library, filtered to that shelf).
- Deleting a shelf removes joins only, never books.

### Settings
- Account header (avatar, display name, email, non-editable for MVP).
- Sign out (confirm → clear tokens → sign-in screen).
- Theme: System / Light / Dark.
- Privacy Policy and Terms links (external URLs).
- App version (from `expo-application`).
- Delete account (typed-confirmation "delete" → `DELETE /v1/account` → sign-in screen).

### Covers & fallbacks
- Preferred: Google Books thumbnail URL stored on the `books` row.
- Fallback for manual entries without a URL: a deterministic colored tile (hash title → 1 of 8 muted palette colors) with the title overlaid in a serif font.

### Offline behavior
- Online-only with React Query's default in-memory session cache. During a session, revisiting a loaded screen is instant. Nothing is persisted to disk; cold-start offline shows error states.
- Any mutation requires connectivity. No offline queue.

### Error UX
- Network errors → non-blocking toast "No connection. Retry?"
- 4xx validation → inline field errors pulled from RFC 7807 `errors[]`.
- 4xx conflicts / not-found → toast with context-specific copy.
- 5xx → toast "Something went wrong. We've been notified." Sentry captures `request_id`.
- 401 → silent refresh attempt → retry once → on failure, sign out.
- Add-flow failures (search API down, ISBN lookup errors) → UI offers both Retry and a manual-entry fallback (prefilled with any known data like the scanned ISBN).

## 8. Observability

- **Sentry** on backend and mobile (errors only, no PII in breadcrumbs).
- **Structured logs** on backend via `structlog`: one access log per request plus business events (`book_added`, `status_changed`, `shelf_created`, `book_removed`, `auth_login`, `auth_refresh_failed`). Every log includes `request_id` and (when authed) `user_id`.
- **Log aggregation:** `fly logs` tail for MVP. Axiom deferred until retention/query becomes a pain point.
- No product analytics SDK.

## 9. Security & Privacy

- Secrets loaded from environment (Fly secrets): `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`.
- `GOOGLE_BOOKS_API_KEY` optional — added later only if anonymous quota becomes limiting.
- Refresh tokens stored server-side (hashed) for revocation support.
- Mobile refresh tokens in `expo-secure-store` (Keychain / Keystore).
- Account deletion is a hard delete — cascades across `user_books`, `shelves`, `book_shelves`, and server-side refresh tokens. The shared `books` metadata row stays.
- HTTPS everywhere (Fly provides TLS).
- Privacy Policy and Terms of Service pages required before store submission.

## 10. Local Development & Testing

### Local setup
- `docker-compose.yml` runs Postgres 16.
- Backend: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.
- Mobile: `npx expo start`.
- Base URL configured via `EXPO_PUBLIC_API_URL`. For physical devices, use the dev machine's LAN IP; simulators can use localhost (`10.0.2.2` for Android emulator).
- Dev-login endpoint behind an env flag (`ENABLE_DEV_LOGIN=true`) mints a JWT without Google → simplifies local testing.

### Automated testing
- **Backend:** pytest with a dedicated test database, transaction-rollback fixtures per test. `httpx.AsyncClient` against the FastAPI app directly. Mock only at external boundaries: Google Books HTTP client, Google OAuth verifier. Everything else hits real Postgres.
- **Mobile:** Jest + React Native Testing Library for components and hooks. `msw` for network mocking so the real API client code is exercised.
- **E2E:** none for MVP.

### CI
- `backend.yml` runs pytest against a Postgres service container on PRs touching `backend/**`.
- `mobile.yml` runs Jest + TypeScript check + Expo prebuild on PRs touching `mobile/**`.
- Deploy: merge to main → `fly deploy` for backend. Mobile deploys via EAS Build (manual) for store submissions and `eas update` for OTA.

## 11. Deployment

- **Backend:** Fly.io, Dockerfile-based build. Single machine for MVP. Alembic migrations applied manually (not auto-run on deploy).
- **Postgres:** Fly Postgres, small tier.
- **Mobile binaries:** EAS Build → submit to App Store Connect and Google Play Console.
- **Mobile OTA updates:** `eas update` for JS/TS-only changes.

## 12. Open TODOs (not design decisions)

- Register `colophon.app` (or fallback) domain.
- Create Google Cloud project + OAuth 2.0 client IDs (iOS, Android, and optionally a web client for Expo auth proxy).
- Generate Privacy Policy and Terms of Service (e.g. via Termly) and host them at stable URLs.
- Design app icon and splash screen.
- Prepare App Store and Play Store listing assets (screenshots, descriptions, age rating).
- Confirm no name collision for "Colophon" in the Books category on both stores before first submission.

## 13. Decision Log

Major decisions, traceable to the grill (Q1–Q50 inclusive):

| # | Decision |
|---|---|
| 1 | Multi-user app with Google OAuth sign-in |
| 2 | iOS + Android only, no web |
| 3 | Google OAuth2 for first iteration; Apple Sign-In deferred but required before iOS launch |
| 4 | Backend: Python 3.12 + FastAPI + PostgreSQL + SQLAlchemy 2.0 + Alembic |
| 5 | Mobile: React Native + Expo + TypeScript |
| 6 | Backend issues own JWT (1h) + rotating refresh token (30d) after verifying Google ID token |
| 7 | Add via ISBN scan + text search + manual; Google Books as metadata source |
| 8 | Reading status enum: want_to_read / reading / read |
| 9 | Shelves user-created, optional seed on first launch |
| 10 | Rating 1–5 integer, nullable |
| 11 | Notes single markdown field, ~10k cap client-side |
| 12 | Dates: added_at auto; started_at/finished_at auto-set on transitions, nullable, editable |
| 13 | No reading progress tracking for MVP |
| 14 | Covers = Google Books URLs stored on books rows; deterministic color-tile fallback for manuals |
| 15 | Book uniqueness: UUID PK, unique google_books_id + unique isbn_13, per-edition (no works table) |
| 16 | Online-only with React Query in-memory session cache |
| 17 | In-library text search server-side via ILIKE |
| 18 | Book search proxies through backend to Google Books |
| 19 | Two-step add flow: search result → preview screen → pick status → added |
| 20 | Duplicate handling: badged in search, tap edits instead of adds; unique (user_id, book_id) |
| 21 | Manual entry: title required, all other fields optional |
| 22 | Shelves: max 10 per user; delete removes joins only, books stay |
| 23 | Offset pagination (library 50, search 20) |
| 24 | RFC 7807 error format |
| 25 | Hard account deletion required in MVP; data export deferred |
| 26 | No stats screen for MVP |
| 27 | Tokens: access in memory, refresh in expo-secure-store; 1h / 30d rotating |
| 28 | Fly.io + Fly Postgres + GitHub Actions; migrations manual |
| 29 | Monorepo |
| 30 | No push notifications for MVP |
| 31 | Sentry + structlog; no Axiom; no product analytics |
| 32 | No rate limiting for MVP (deferred, flagged) |
| 33 | No cap on number of books in reading status |
| 34 | Book removal: hard delete with confirm dialog |
| 35 | Status reversal never auto-wipes dates; re-read overwrites finished_at, no history |
| 36 | Empty state single "Add a book" CTA opening a shared bottom sheet; same sheet via header + |
| 37 | Three tabs: Library / Shelves / Settings |
| 38 | OTA updates enabled via EAS Update |
| 39 | Local dev + prod only; no staging |
| 40 | PII: google_sub, email, display_name, avatar_url; no Google tokens stored |
| 41 | English only, no i18n scaffolding |
| 42 | Error UX tiered: toast for network, inline for validation, toast+Sentry for 5xx, silent 401 refresh |
| 43 | Refresh-token expiry: silent sign-out, no toast on cold start, toast if mid-action |
| 44 | No force-update mechanism for MVP; backwards compatibility within /v1/ is the contract |
| 45 | Book detail screen layout as specified |
| 46 | Deterministic color-tile cover fallback for manual entries |
| 47 | Shelves tab is a vertical list with name + count + trailing thumbnails |
| 48 | ISBN scanner uses expo-camera, viewfinder overlay, haptics, manual-entry fallback |
| 49 | Search screen: 300ms debounce, 2-char min, skeletons, infinite scroll, manual fallback on error |
| 50 | Settings tab contents: account header, theme, about, delete account |
| 51 | App name: Colophon; bundle ID: com.avg.colophon |
| 52 | ISBN lookup is local-first with Google Books fallback; text search always hits Google Books |
