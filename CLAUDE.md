# Colophon

Personal book-catalog mobile app (iOS + Android). Monorepo: `backend/` (Python + FastAPI + Postgres) and `mobile/` (Expo + React Native + TypeScript). Code not yet written — working from specs.

## Specs

- **PRD:** GitHub issue #3 — implementation plan, source of truth for slice scoping.
- **Slices:** GitHub issues #4–#20 — vertical deliverables; each has a parent (#3) and a `Blocked by` dependency.
- **Design spec:** `docs/specs/2026-04-23-colophon-design.md` — the original design grill, approved 2026-04-23. Historical; the PRD is what to build against.
- **Ubiquitous language:** `docs/specs/UBIQUITOUS_LANGUAGE.md` — canonical vocabulary. Read before proposing names in code, specs, or UI copy. It's the tiebreaker on any terminology question.

## Conventions

The glossary has the full terminology decisions. Three that are easy to trip over:

- **Book vs. Library Entry.** `books` is the shared catalog; `library_entries` is per-user state. SQLAlchemy model is `LibraryEntry`, path param is `:entry_id`, FK in `book_shelves` is `entry_id` (composite PK `(entry_id, shelf_id)`). In prose and UI always say **Library Entry** — never "user book".
- **Three distinct deletes, three distinct verbs.** **Remove from Library** (`DELETE /v1/catalog/books/:entry_id`, hard-deletes one **Library Entry** + its **Shelf Assignments**), **Delete Shelf** (joins only; **Library Entries** stay), **Delete Account** (cascades everything except shared **Books**). Never a bare "delete" in method names or user-facing copy.
- **Session is auth only.** A **Session** is the Access Token + Refresh Token pair. The React Query in-memory cache is not a session and is not a domain concept.

## MVP scope

The PRD is the fence. No rate limiting, no Apple Sign-In, no stats, no offline queue, no i18n, no staging environment — all explicitly deferred. Flag any request that implies one of these as out of scope before acting.
