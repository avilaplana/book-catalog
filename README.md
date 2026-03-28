# Book Catalog

A personal book cataloging app — FastAPI backend + React Native (Expo) mobile frontend.

```
book-catalog/
├── backend/    # FastAPI + PostgreSQL API
└── mobile/     # React Native (Expo) app
```

## Quick start (E2E)

### 1. Start the backend

```bash
cd backend
cp .env.example .env   # then fill in JWT_SECRET and GOOGLE_CLIENT_ID
make setup             # venv + postgres + migrations (first time only)
make run               # starts API on http://localhost:8000
```

See `backend/README.md` for full backend setup (pyenv, Docker, Google credentials).

### 2. Start the mobile app

```bash
cd mobile
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL=http://localhost:8000 and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
npm start              # starts Expo dev server
```

Open Expo Go on your device and scan the QR code, or press `i` for iOS simulator / `a` for Android emulator.

See `mobile/README.md` for full mobile setup (Google Sign-In credentials, simulator setup).

---

## Running tests

### Backend (requires PostgreSQL running)

```bash
cd backend
make db-start   # if not already running
make test       # 37 tests
```

### Mobile (no backend or device needed)

```bash
cd mobile
npm test        # 25 tests, all mocked
```

---

## E2E walkthrough

Once both backend and mobile are running:

1. **Sign in** — tap "Sign in with Google" on the Login screen
2. **Discover** — search for a book by title/author, or tap 📷 to scan a barcode
3. **Add to catalog** — choose a reading status (Want to Read / Reading / Read) and tap Add
4. **Library** — browse your books filtered by status
5. **Book detail** — change status, rate with stars, add private notes, see shelves
6. **Profile** — view reading stats, sign out

---

## Google credentials

Both backend and mobile share the same Google Cloud project:

| Where | Variable | Value |
|---|---|---|
| `backend/.env` | `GOOGLE_CLIENT_ID` | Web client ID |
| `mobile/.env` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web client ID |

Create a project at [console.cloud.google.com](https://console.cloud.google.com), enable the **People API**, and create an OAuth 2.0 Web client ID.

---

## Tech stack

| Layer | Tech |
|---|---|
| API | FastAPI, SQLAlchemy 2, Alembic, python-jose, httpx |
| Database | PostgreSQL 14 (Docker) |
| Auth | Google OAuth → JWT |
| Books | Google Books API |
| Mobile | React Native 0.74, Expo SDK 51, TypeScript |
| State | Zustand (auth), React Query v5 (server data) |
| Tests | pytest (backend), Jest + RNTL (mobile) |
