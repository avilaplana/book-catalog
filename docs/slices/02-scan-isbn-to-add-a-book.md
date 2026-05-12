# Slice 2 — Scan an ISBN to add a book

## Purpose

After this slice ships, a Colophon user can:

1. From the Search screen, open a barcode Scanner.
2. Point the camera at the ISBN barcode on the back of a physical book.
3. See the matching book(s) from Google Books, tap one, and Add it to their Library.

That is the entire user-perceivable capability of Slice 2. It is an additional on-ramp to the existing Preview → Add flow from Slice 1 — nothing about Add, the Library, or auth changes.

## Background

Slice 1 deferred "ISBN barcode scanning". This slice delivers it. A scannable book barcode is a Bookland EAN-13 (prefix `978`/`979`) — see the **ISBN** term in [`/CONTEXT.md`](../../CONTEXT.md).

**This is a mobile-only slice.** The backend needs no change: the existing `GET /v1/books/search?q=...` already proxies to Google Books, and Google Books resolves `q=isbn:9780261103573` natively. Mobile sends `isbn:<ean13>` as the query. One mobile issue, no backend/mobile split.

## In scope

**Entry point**
- The Search screen gains a header-right "Scan" button. Tapping it pushes a new **Scanner** screen.
- The Library screen does **not** get a scan button in this slice. From an empty Library the path is: "Find a book" → Search → Scan.

**Scanner screen**
- Uses `expo-camera` (`CameraView` with `barcodeScannerSettings={{ barcodeTypes: ['ean13'] }}` and `onBarcodeScanned`). Runs in the dev build / EAS build (the app already ships `expo-dev-client`); not in vanilla Expo Go.
- Camera permission is requested on mount (`useCameraPermissions`):
  - undetermined / loading → spinner;
  - granted → live camera;
  - denied / blocked → message "Camera access is needed to scan barcodes." with an **"Open Settings"** button (`Linking.openSettings()`). No dead end.
- A static "aim here" framing rectangle is overlaid on the viewfinder.
- A torch toggle (header or overlay button) controls `CameraView`'s `enableTorch` for low light.
- **One-shot scan**: on the first valid barcode, set a `scanned` flag, stop reacting to further reads, and navigate to **ScanResults** with the scanned digits. When the Scanner regains focus (`useFocusEffect`), reset the flag so the user can scan the next book.
- **Book-barcode filter**: only EAN-13 codes whose prefix is `978` or `979` are accepted. A read that isn't (e.g. a product barcode) is discarded, the camera stays live, and a brief overlay line shows "That's not a book barcode — point at the ISBN on the back cover." for ~2s, then fades.

**ScanResults screen**
- Receives the scanned ISBN as a route param. On mount it calls `GET /v1/books/search?q=isbn:<isbn>` once (no debounce, no text input).
- Renders the returned volumes (0..n) as book rows — cover thumbnail, title, author — using the same row component as the Search screen (extract a shared `BookRow`).
- Tapping a row pushes the existing **Preview** screen with that result.
- Zero results → centred empty state "No book found for this barcode." with a primary **"Scan again"** button that pops back to the live Scanner.
- Header / OS back from ScanResults returns to the Scanner.

**Preview + Add (unchanged from Slice 1)**
- Preview shows cover, title, author, description and a single "Add" button.
- "Add" → `POST /v1/library/books` with `{google_books_id}`.
- 201 → navigate to Library; new book at the top; toast "Added to your library."
- 409 → toast "Already in your library."; stay on Preview.
- Back from Preview returns to ScanResults (with its results preserved); back from ScanResults returns to the live Scanner.

**Navigation**
- React Navigation native stack, extending Slice 1's stack.
- Login → Library → Search → **Scanner** → **ScanResults** → Preview → (Add) → Library.
- Back navigation always returns to the previous screen; the user is never trapped.

## Error handling & feedback

| Source | UX |
|---|---|
| Camera permission undetermined / loading | Spinner on the Scanner screen |
| Camera permission denied / blocked | "Camera access is needed to scan barcodes." + "Open Settings" button |
| EAN-13 read that isn't a book (prefix ≠ 978/979) | Discard; keep scanning; ~2s overlay hint "That's not a book barcode — point at the ISBN on the back cover." |
| `GET /v1/books/search?q=isbn:...` returns zero results | ScanResults empty state "No book found for this barcode." + "Scan again" button |
| Network unreachable on the lookup | Toast: "Couldn't reach the server. Tap to retry." (reuses Slice 1 toast; retry re-runs the lookup) |
| 5xx on the lookup | Toast: "Something went wrong. Tap to retry." (reuses Slice 1 toast) |
| 401 on the lookup | Silent `POST /v1/auth/refresh` + retry once; on failure, route to Login (existing client behaviour) |
| 409 from `POST /v1/library/books` | Toast: "Already in your library." (unchanged) |

## Out of scope (deferred to later slices)

- Manual ISBN entry (typing the 13 digits when the camera can't read it) — belongs with the deferred "manual book entry" slice.
- Batch scanning (scan several books, add many at once).
- A scan entry point on the Library screen.
- ISBN-10 handling (no scannable barcode for it).
- Storing the ISBN on the `Book` (no column, no migration this slice).
- Any backend change.
- Everything already listed as out of scope in Slice 1 (removing books, detail screen, reading status, shelves, settings, tab bar, telemetry, etc.).

## Stack additions

- **Mobile**: `expo-camera` (added via `expo install`); `expo-camera` config plugin in `app.json` with iOS/Android camera permission strings ("Used to scan book barcodes"). Everything else is unchanged from Slice 1.
- **Backend**: unchanged.

## API surface

No new endpoints. Mobile reuses:

| Method | Path | Use in this slice |
|---|---|---|
| GET | `/v1/books/search?q=isbn:<ean13>` | Resolve a scanned barcode to Google Books volumes |
| POST | `/v1/library/books` | Add the chosen book (body `{google_books_id}`; 201 / 409) |

## Data model

No change. No migration.

## Definition of done

- [ ] From the Search screen, tapping "Scan" opens the camera; granting permission shows a live viewfinder with the framing guide and torch toggle.
- [ ] Scanning a real book's barcode lands on ScanResults showing the matching book(s); tapping one opens Preview; "Add" puts it at the top of the Library with the "Added to your library." toast.
- [ ] Scanning a non-book EAN-13 keeps the camera live and shows the brief hint, no navigation.
- [ ] An ISBN with no Google Books match shows "No book found for this barcode." with a working "Scan again" button.
- [ ] Denying camera permission shows the explanatory message with a working "Open Settings" button — no dead end.
- [ ] Network / 5xx during the lookup show the existing retry toasts; tapping retries the lookup.
- [ ] Duplicate add still returns 409 with the "Already in your library." toast.
- [ ] Back navigation from Preview → ScanResults → Scanner → Search works at every step; returning to the Scanner re-enables scanning.
- [ ] Mobile builds and runs on iOS and Android via the dev/EAS build (camera requires the native module).

## Reference

- Slice 1: [`01-find-and-save-a-book.md`](./01-find-and-save-a-book.md)
- Domain language: [`/CONTEXT.md`](../../CONTEXT.md) — see the **ISBN** term
