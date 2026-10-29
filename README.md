# Store app

**Picking this project up? Start with [docs/HANDOVER.md](docs/HANDOVER.md)**: where everything
is, what's built, what's left, and this PC's build quirks.

The customer app for Keryana Store, built with Expo (SDK 58), Expo Router and TypeScript.
One codebase serves any store running the same Laravel API (`/api/v1`, documented in the
Laravel repo's `docs/api_v1.md`): the store is chosen when the app is started or built.

## Stores

`stores/<store>.json` holds what is fixed into a build: app name, bundle id / package name,
URL scheme, website, API URL. Everything that can change without a release (theme colour,
logo, contact details, payment methods) comes from the store's `GET /api/v1/settings` at
launch.

Before the first build, fill in `stores/keryana.json`: `website`, `apiUrl` (the live
domain + `/api/v1`), and confirm `iosBundleId` / `androidPackage`.

## Run it

```bash
npm install
STORE=keryana npx expo start
```

Open it in **Expo Go** on a phone on the same network (scan the QR code). Everything in this
version works in Expo Go. A development build (`npx eas-cli@latest build --profile development`)
is only needed once native features that Expo Go lacks are added (push notifications on
Android, Sign in with Apple).

To point a dev run at another server without editing the store file:

```bash
EXPO_PUBLIC_API_URL=https://staging.example.com/api/v1 STORE=keryana npx expo start
```

On Windows PowerShell, set variables first: `$env:STORE="keryana"; npx expo start`.

## Google sign-in

Uses the native Google sign-in (`@react-native-google-signin/google-signin`), so it works
in development and store builds only, not in Expo Go. Per store:

1. `googleWebClientId` in `stores/<store>.json`: the OAuth **web** client id (the same one
   the website's Google login uses).
2. On the server, `.env`: `GOOGLE_APP_CLIENT_IDS=<that web client id>`, so the API accepts
   the app's tokens.
3. In Google Cloud console → Credentials, an **Android** OAuth client with the app's package
   name and the SHA-1 of each signing key (EAS: `npx eas-cli@latest credentials`; Play
   Console: App signing key). Without it the sign-in sheet fails with DEVELOPER_ERROR.
4. For iPhone: an **iOS** OAuth client for the bundle id, its id in `googleIosClientId`.
   Until then the Google button is hidden on iOS.

## Check before committing

```bash
npx tsc --noEmit
npx expo lint
```

## Layout

| Path | What |
|---|---|
| `src/app/(tabs)/` | Home, Categories, Search, Cart, Account (native tabs) |
| `src/app/` | Screens pushed over the tabs: product, category, brand, checkout, login, register, forgot password, orders, track |
| `src/lib/api.ts` | API client: login token or guest cart token, app version, platform; 401 logs out, 426 shows "please update" |
| `src/hooks/queries.ts` | TanStack Query hooks for every endpoint |
| `src/state/session.ts` | Login token (secure store), guest cart token and city (AsyncStorage) |
| `src/theme/` | Colours, with the accent from the store's `primary_color` |
| `src/i18n/` | All visible text (English; Urdu later) |

## Status

Phase 3 (MVP) of the plan: browse, search, product, cart, email login / sign-up / password
reset, checkout with Cash on Delivery and Bank Transfer, orders (cancel, order again), guest
tracking. Phase 4 adds PayFast, push notifications, deep links, wishlist, wallet, returns,
address book, Google / Apple sign-in and account deletion.
