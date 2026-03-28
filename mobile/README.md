# Book Catalog — Mobile

React Native (Expo SDK 51) app for cataloging books via Google Sign-In, ISBN scan, and search.

## Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) — manages Node versions per project
- [Expo Go](https://expo.dev/go) on your iOS or Android device (for running on a real device), or a simulator/emulator

### Install nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Reopen your terminal, then verify:

```bash
nvm --version
```

> **Prefer a faster alternative?** [fnm](https://github.com/Schniz/fnm) is a drop-in replacement: `brew install fnm`.

## Setup

```bash
cd mobile
make setup
```

This installs the pinned Node version (from `.nvmrc`), runs `npm install`, and creates `.env` from `.env.example`.

Then edit `.env` and fill in:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web client ID from Google Cloud Console |

Edit `.env` and fill in:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://localhost:8000`) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web client ID from Google Cloud Console |

## Common commands

| Command | Description |
|---|---|
| `make setup` | Install Node + dependencies + create `.env` |
| `make run` | Start Expo dev server (Metro bundler) |
| `make ios` | Open on iOS simulator |
| `make android` | Open on Android emulator |
| `make test` | Run all tests |

## Running the app

```bash
make run
```

After the dev server starts, scan the QR code with Expo Go on your device, or press `i` for iOS simulator / `a` for Android emulator.

> The backend must be running before you can sign in or load any data. See `backend/README.md` for setup instructions.

## Running tests

Tests use Jest + React Native Testing Library. All tests are unit/integration tests with mocked dependencies — no device or backend needed.

```bash
make test
```

Expected output: **25 tests passing across 11 test suites** covering API client, catalog API, auth store, components (BookCard, StatusTabs, StarRating), and screens (Login, Library, BookDetail, Discover, Profile).

To run a specific test file:

```bash
npx jest __tests__/api/client.test.ts
npx jest __tests__/screens/LoginScreen.test.tsx
```

## Project structure

```
mobile/
├── src/
│   ├── types/index.ts          # Shared TypeScript types
│   ├── api/                    # Axios API client + per-resource modules
│   ├── store/authStore.ts      # Zustand auth state (token, signIn, signOut)
│   ├── navigation/             # React Navigation stack/tab setup
│   ├── screens/                # One folder per tab (auth, library, discover, add, profile)
│   └── components/             # Shared UI components
├── __tests__/                  # Mirrors src/ structure
├── App.tsx                     # Entry point (QueryClient + NavigationContainer)
├── app.json                    # Expo config
└── .env.example                # Environment variable template
```

## Google Sign-In setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **People API**
3. Create an OAuth 2.0 Web client ID
4. Paste the client ID into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in your `.env`

For iOS builds you also need an iOS client ID configured in `app.json` under `googleServicesFile`. For development with Expo Go the web client ID is sufficient.
