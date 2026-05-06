# Colophon

Personal book-catalog mobile app. See [`CONTEXT.md`](./CONTEXT.md) for the domain glossary and [`docs/slices/`](./docs/slices/) for the active product slice.

## Layout

```
backend/   Python 3.12 + FastAPI + uv
mobile/    React Native + Expo (TypeScript)
docs/      slices, ADRs, agent skill config
```

## Prerequisites

### `uv` (backend dependency manager)

```sh
brew install uv                                # macOS, recommended
# or, cross-platform:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

`uv` brings its own managed Python — you do not need to install Python 3.12 separately.

### Node + `npm` (mobile)

```sh
brew install node                              # macOS, recommended
# or, with nvm:
nvm install --lts
```

Anything from Node 20 LTS onward works.

## Backend

```sh
cd backend
uv sync                                        # install deps + editable package
uv run uvicorn colophon.app:app --reload       # serve on http://localhost:8000
uv run pytest                                  # run tests
uv run ruff check && uv run ruff format        # lint and format
```

Open <http://localhost:8000/v1/health> to confirm the server is up.

## Mobile

Bootstrapped with [Expo](https://docs.expo.dev/).

```sh
cd mobile
npm install
npm run ios       # iOS Simulator (macOS only)
npm run android   # Android Emulator
npm run web       # browser
```

The mobile app fetches `http://localhost:8000/v1/health` on launch and shows the result. Start the backend first.

**Network note:** `localhost` works from the iOS Simulator and the web target. From the Android Emulator, the host machine is reachable at `10.0.2.2` instead of `localhost` — edit `HEALTH_URL` in `mobile/App.tsx` if you target Android. From a physical device, use your machine's LAN IP.
