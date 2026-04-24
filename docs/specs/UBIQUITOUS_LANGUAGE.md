# Ubiquitous Language

Source material: `docs/specs/2026-04-23-colophon-design.md`, PRD (issue #3), and slice specs (issues #4–#20).

## Identity & Authentication

| Term                | Definition                                                                                    | Aliases to avoid                                 |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **User**            | A person with a Colophon account, uniquely identified by `google_sub`                         | Account holder, member, profile                  |
| **Account**         | The persisted record of a **User** in Colophon (the `users` row and everything it owns)       | Profile, user record                             |
| **Google Account**  | The external Google identity a **User** signs in with; never stored beyond `google_sub`/email | Google login, Google user                        |
| **Google ID Token** | Short-lived Google-issued JWT the mobile app submits once to `POST /v1/auth/google`           | Google token, OAuth token                        |
| **Access Token**    | Colophon-issued JWT (1 hour) used in `Authorization: Bearer`                                  | App token, API token, JWT (when ambiguous)       |
| **Refresh Token**   | Opaque rotating token (30 days), stored hashed server-side and in `expo-secure-store`         | Long-lived token                                 |
| **Session**         | The authenticated client state: an Access Token in memory + a Refresh Token in secure storage | Login, logged-in state, React Query cache (no — that's distinct) |
| **Silent Refresh**  | The API client's single automatic refresh-and-retry on a 401                                  | Auto-relogin, re-auth                            |
| **Dev-Login**       | `POST /v1/auth/dev-login` behind `DEV_LOGIN_ENABLED` that mints tokens without Google         | Test login, fake login                           |

## Catalog

| Term                | Definition                                                                                                          | Aliases to avoid                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Book**            | A canonical row in the shared `books` table — one per edition, identified by `google_books_id` or `isbn_13`         | Title, catalog item, work (see below)    |
| **Edition**         | The granularity of a **Book**: a specific published version, not a consolidated "work"                              | Work, release                            |
| **Google Books**    | The external metadata source Colophon proxies for title/author search and ISBN lookup                               | GB, books API                            |
| **Google Books ID** | The external identifier assigned by Google Books; unique on `books`                                                 | GB ID, external ID                       |
| **ISBN-13**         | The 13-digit barcode identifier; unique on `books`; also the scan payload                                           | ISBN, barcode (barcode is the UI term)   |
| **Cover**           | The book's image: Google Books thumbnail URL on the `books` row, or a deterministic fallback tile for manual entries | Thumbnail, image                         |
| **Cover Fallback**  | The hash-of-title → 1-of-8 muted palette tile used when no cover URL exists                                         | Placeholder, default image               |
| **Manual Entry**    | A **Book** created by the user with no `google_books_id` or `isbn_13`; does not dedupe across users                 | Custom book, user-entered book           |

## Library & Reading Lifecycle

| Term                  | Definition                                                                                                        | Aliases to avoid                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Library**           | The set of **Library Entries** owned by one **User**                                                              | Collection, shelf (shelf is distinct)       |
| **Library Entry**     | A **User**'s personal state about a **Book**: one `library_entries` row (status, rating, notes, dates, shelf links) | User book, my book, book-in-library         |
| **Reading Status**    | The enum on a **Library Entry**: `want_to_read`, `reading`, `read`                                                | Status (when ambiguous), state              |
| **Forward Transition**| A **Reading Status** change that advances the lifecycle (→ `reading` or → `read`); auto-fills the matching date   | Status bump                                 |
| **Reversal**          | A backward **Reading Status** change; never wipes any dates                                                       | Rollback, undo                              |
| **Re-read**           | A second `→ read` transition; overwrites `finished_at` with the latest finish (no history kept in MVP)            | Re-reading, second read                     |
| **Added Date**        | `added_at` — set automatically when a **Library Entry** is created; editable                                      | Created at (implementation detail)          |
| **Started Date**      | `started_at` — auto-set on `→ reading` if null; editable; nullable if the user skipped straight to `read`         | Begin date                                  |
| **Finished Date**     | `finished_at` — auto-set on `→ read` (overwrites on **Re-read**); editable                                        | End date, completion date                   |
| **Rating**            | Integer 1–5 on a **Library Entry**; nullable; tapping the already-lit star clears it                              | Score, stars (UI element term only)         |
| **Notes**             | Per–**Library Entry** markdown text with a ~10k-char client-side soft cap                                         | Review, comment                             |

## Organization (Shelves)

| Term                   | Definition                                                                                                    | Aliases to avoid                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Shelf**              | A user-created, user-scoped grouping of **Library Entries**; unique by name per **User**                      | Tag, category, list, folder         |
| **Shelf Cap**          | The server-enforced limit of 10 **Shelves** per **User**; `POST /v1/catalog/shelves` returns 409 when reached | Shelf limit, quota                  |
| **Shelf Assignment**   | The `book_shelves` link (composite PK `(entry_id, shelf_id)`) between one **Library Entry** and one **Shelf** (many-to-many) | Shelf membership, book-shelf link   |
| **First-launch Seed**  | The one-time prompt offering to create a handful of starter **Shelves**; respects the **Shelf Cap**           | Default shelves, onboarding shelves |
| **Shelf Detail**       | A screen that reuses the **Library** view pre-bound to a `shelf_id`                                           | Shelf page                          |

## Add-Book Flow

| Term                      | Definition                                                                                                     | Aliases to avoid                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Catalog Search**        | `GET /v1/catalog/search` — always proxies to **Google Books**; offset-paginated at 20/page                     | External search, book search             |
| **Library Search**        | The `search` query on `GET /v1/catalog/books` — server-side `ILIKE` over title/author within one **Library**   | Internal search, local search            |
| **ISBN Scan**             | The `expo-camera` barcode flow that reads an **ISBN-13** and runs an **ISBN Lookup**                           | Barcode scan, camera scan                |
| **ISBN Lookup**           | `GET /v1/catalog/books/by-isbn/:isbn` — local-first; falls through to **Google Books** on miss and persists    | ISBN fetch, by-isbn                      |
| **Preview Screen**        | The pre-commit screen showing cover, title, authors, description, and a three-button **Reading Status** picker | Confirm screen, detail-before-add        |
| **In-Library Badge**      | The "In library" marker on a **Catalog Search** result that already has a matching **Library Entry**           | Owned badge, added marker                |
| **Duplicate Add**         | `POST /v1/catalog/books` for a **Book** already in the **Library** — returns the existing **Library Entry**    | Re-add, already-added                    |
| **Manual-Entry Fallback** | The path offered when **Catalog Search** or **ISBN Lookup** fails; opens **Manual Entry** with known data pre-filled | Manual override                       |

## Destructive Operations

| Term                     | Definition                                                                                                           | Aliases to avoid                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Remove from Library**  | `DELETE /v1/catalog/books/:entry_id` — hard-deletes the **Library Entry** and its **Shelf Assignments**; the shared **Book** row stays | Delete book, remove book            |
| **Delete Shelf**         | `DELETE /v1/catalog/shelves/:id` — deletes the **Shelf** and its **Shelf Assignments** only; **Library Entries** stay | Remove shelf                           |
| **Delete Account**       | `DELETE /v1/account` behind typed confirmation — cascades `library_entries`, `shelves`, `book_shelves`, and server-side **Refresh Tokens** | Close account, wipe account          |

## Observability & Errors

| Term                       | Definition                                                                                                       | Aliases to avoid                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Business Event**         | A named structured log (`book_added`, `status_changed`, `shelf_created`, `book_removed`, `auth_login`, `auth_refresh_failed`) | Audit event, tracking event         |
| **Request ID**             | Per-request correlation ID bound into `structlog` and surfaced in error responses and Sentry                     | Trace ID, correlation ID              |
| **Problem Details**        | The RFC 7807 JSON error body (`type`, `title`, `status`, `detail`, optional `errors[]`) used on every 4xx/5xx    | Error payload, error envelope         |
| **Mid-Action Toast**       | One-time toast on session expiry only if the user was interacting — suppressed on cold start                     | Session-expired banner                |

## Delivery Vocabulary

| Term              | Definition                                                                                                     | Aliases to avoid               |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Slice**         | A vertical GitHub issue that cuts through backend + mobile (e.g. "Slice 5: Add book via search")               | Milestone, epic, story         |
| **Tracer Bullet** | The first end-to-end wiring proof (Slice 1) — monorepo, CI, `/health`, no features                             | Skeleton, scaffold             |
| **HITL / AFK**    | Slice type: **HITL** needs a human decision (e.g. OAuth client IDs); **AFK** can run autonomously              | Blocked / unblocked            |
| **MVP**           | The scope defined in the design spec §2 — Google-only auth, offline-free, no stats, hard-delete-only, etc.     | v1, launch scope               |

## Relationships

- A **User** owns exactly one **Library**, many **Shelves** (up to the **Shelf Cap**), and many **Refresh Tokens** (one active chain per device).
- A **Library** contains zero or more **Library Entries**.
- A **Library Entry** references exactly one **Book** and zero or more **Shelves** via **Shelf Assignments**; uniqueness is `(user_id, book_id)`.
- A **Book** is shared across all **Users**; deleting any **Library Entry** or **Account** never deletes the **Book**.
- A **Reading Status** **Forward Transition** auto-fills the corresponding date; a **Reversal** never wipes a date; a **Re-read** overwrites **Finished Date**.
- **Delete Account** cascades to `library_entries`, `shelves`, `book_shelves`, and server-side **Refresh Tokens**, but not to **Books**.

## Example dialogue

> **Dev:** "When a **User** taps a **Catalog Search** result that's already in their **Library**, what do we POST?"

> **Domain expert:** "Nothing — the **In-Library Badge** means we already have a **Library Entry** for that **Book**. Tap navigates to the book detail, not the **Preview Screen**. The **Duplicate Add** path only matters if they somehow trigger `POST /v1/catalog/books` for a **Book** they already own; we return the existing **Library Entry** instead of a 409."

> **Dev:** "And if they change **Reading Status** from `read` back to `reading`, do we clear **Finished Date**?"

> **Domain expert:** "No. That's a **Reversal**, and reversals never wipe dates. If they later mark it `read` again — a **Re-read** — we overwrite **Finished Date** with the new finish. No history table in MVP."

> **Dev:** "If they **Delete Account**, does that remove the underlying **Book** rows too?"

> **Domain expert:** "No. **Book** rows are shared catalog data. **Delete Account** cascades **Library Entries**, **Shelves**, **Shelf Assignments**, and server-side **Refresh Tokens** — the catalog stays."

> **Dev:** "What about **Remove from Library** — same rule?"

> **Domain expert:** "Same rule. It's a hard delete of one **Library Entry** plus its **Shelf Assignments**. The **Book** is untouched, and other **Users** with the same **Book** are unaffected."

## Terminology decisions

Each entry below started as an ambiguity in the source material. The canonical choice and its resolution are kept together so the rationale travels with the decision — if someone later asks "why isn't this called X?", the answer is right here.

- **"Book" is overloaded.** In the original design spec "book" was used both for the shared canonical row (then `books`) and for a user's personal entry (then `user_books`). These are distinct concepts: a **Book** is shared catalog data; a **Library Entry** is user-scoped state about that **Book**.
  **Resolution:** In prose, specs, and UI copy, always use **Book** for the catalog row and **Library Entry** for the per-user row. In code and schema: SQLAlchemy model `LibraryEntry`, DB table `library_entries`, path param `:entry_id` (e.g. `/v1/catalog/books/:entry_id`), FK column `entry_id` in `book_shelves` → composite PK `(entry_id, shelf_id)`. The `books` table keeps its name.

- **"Account" vs "Google Account".** User stories 1 and 53 say "sign in with my Google account" and "see my Google account info" — both refer to the external **Google Account**. Meanwhile "delete my account" means the Colophon **Account**.
  **Resolution:** **Account** always means the Colophon record. The external identity is always qualified as **Google Account**. PRD and slice copy should be swept to match.

- **"Session" is used for two things.** There's the auth **Session** (Access Token + Refresh Token) and the React Query in-memory "session cache" that lasts the app's lifetime. These are unrelated.
  **Resolution:** **Session** is reserved for auth. The React Query store is referred to as "React Query cache" or "in-memory cache" — it is not a domain concept and does not appear in the glossary.

- **"Search" without a qualifier is ambiguous.** **Catalog Search** always hits Google Books; **Library Search** is local `ILIKE`. The spec mostly disambiguates via path (`/v1/catalog/search` vs the `search` query on `/v1/catalog/books`), but prose doesn't always.
  **Resolution:** In prose and in function/variable names, always qualify: `catalog_search` / `library_search`. Bare "search" only appears as a URL query param, where the surrounding endpoint already disambiguates.

- **"Status" is overloaded** across reading state, HTTP responses, and process state.
  **Resolution:** In domain language, always say **Reading Status**. HTTP status and process status keep their usual names in their usual contexts; they are not domain terms.

- **"Delete" is overloaded across three different operations** with different cascades: removing one **Library Entry**, deleting a **Shelf** (joins only, books stay), and deleting the whole **Account** (cascades everything except **Books**).
  **Resolution:** Three distinct verbs, enforced in both code and user-facing copy: **Remove from Library** (`remove_entry` / `DELETE /v1/catalog/books/:entry_id`), **Delete Shelf** (`delete_shelf` / `DELETE /v1/catalog/shelves/:id`), **Delete Account** (`delete_account` / `DELETE /v1/account`). Never a bare "delete" button or method.

- **"Shelf" vs "Library" as filters.** A **Shelf Detail** screen is the **Library** view with a pre-bound `shelf_id` — not a different entity.
  **Resolution:** One view-model, parameterized. **Shelf Detail** is not a separate screen archetype; it is a **Library** view with a fixed filter. Pagination, sort, and search behave identically.

- **"Work" does not exist in MVP.** Editions are not consolidated; each ISBN and each **Manual Entry** is its own **Book**.
  **Resolution:** "Work" is not a domain term and must not appear in the glossary, code, or specs unless explicitly flagged as a post-MVP concept.
