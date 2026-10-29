# Recarta app — project handover

Everything needed to carry on with the customer mobile app in a new thread. Last updated
2026-10-29. Read this first, then `README.md` (how to run) and the Laravel repo's
`docs/api_v1.md` (the API).

## 1. What this is

A React Native (Expo) shopping app for the stores that run the **Keryana Laravel codebase**.
One codebase, one app per store: the store is picked at build time.

| | |
|---|---|
| App repo | `D:\wamp64\www\store-app` → github.com/Looper-575/Recarta_Mobile, branch **`main`** |
| Backend repo | `D:\wamp64\www\KeryanaRevamp` → github.com/Looper-575/keryana_revamp, branch `master` |
| Sister store | `D:\wamp64\www\UA Cart` → github.com/Looper-575/UA-Cart (no mobile API yet, see §8) |
| Test server | https://recarta.atlantisbposolutions.com:4343 (API at `/api/v1`) |
| App name / id | **Recarta**, `pk.recarta.com` (Android package and iOS bundle id; final, can't change after publishing) |
| Expo | account `looper575`, project `@looper575/keryana-store` ("Recarta App"), id `9754a79c-9999-4085-81ae-c768bcb5883c` |
| Google Play | app "Recarta Test App", package `pk.recarta.com`, still Draft |
| Plan | Laravel repo `docs/mobile_app_plan.md` (decisions, phases) |

## 2. Stack

Expo SDK 58, Expo Router (routes in `src/app/`), TypeScript, TanStack Query (server data),
Zustand (`src/state/session.ts`: login token in SecureStore, guest cart token and city in
AsyncStorage), i18next (`src/i18n/en.json`, English only, every string through `t()`),
plain React Native styles with a theme hook (`src/theme/`: accent colour from the store's
`primary_color` setting at runtime). React Compiler and typed routes are on.

Native packages beyond the template: expo-secure-store, expo-notifications, expo-image-picker,
expo-crypto, expo-dev-client, expo-apple-authentication, react-native-webview,
@react-native-google-signin/google-signin.

## 3. How a store is configured

`stores/<store>.json` (today only `keryana.json`) holds what is fixed into a build:

```json
{
  "name": "Recarta",                     // name under the icon
  "slug": "keryana-store",              // must equal the Expo project slug (leave as is)
  "scheme": "keryana",                   // app's own URL scheme
  "website": "https://recarta.atlantisbposolutions.com:4343",
  "apiUrl": "https://recarta.atlantisbposolutions.com:4343/api/v1",
  "iosBundleId": "pk.recarta.com",
  "androidPackage": "pk.recarta.com",
  "primaryColor": "#4CAF50",             // fallback until /settings loads
  "easProjectId": "9754a79c-9999-4085-81ae-c768bcb5883c",
  "googleWebClientId": "32656825116-r3aorbd54uefn34ua6mtkoi6jcscmg0j.apps.googleusercontent.com",
  "googleIosClientId": ""                // empty: Google button hidden on iPhone
}
```

`app.config.ts` reads it (`STORE=keryana`, the default). Everything that can change without a
release (name shown in the app, logo, colours, contact details, payment methods, bank details,
`app_min_version`, `app_hide_digital_ios`, `app_icon`) comes from `GET /api/v1/settings` at launch.
App links (website links opening the app) switch on only when `website` is on the standard
https port, so the `:4343` test server builds without them.

## 4. What the app does (all built, typecheck + lint clean)

- **Tabs**: Home (slides, categories with *See all*, featured, brands), Categories (*All* +
  parents in a sidebar), Search (suggestions, results), Cart (badge), Account.
- **Shop**: category / brand lists with sort and infinite scroll, product page (variants,
  retail/corporate price, stock, bulk tiers, back-in-stock, wishlist ♡, share).
- **Cart**: guest cart via `X-Cart-Token`, adopted on login; lines re-priced by the server.
- **Checkout**: on the server's live quote (`/checkout/quote`): saved addresses, delivery or
  pickup + slot, COD, Bank Transfer (receipt photo), PayFast (hosted page in a WebView; the app
  then asks the API whether the order is paid), discount code (mobile platform rule), wallet,
  one `Idempotency-Key` per checkout.
- **Account**: email login, sign-up with emailed code, password reset, Google sign-in
  (Android, dev/store builds only), Sign in with Apple (iPhone), profile, change password,
  delete account (store requirement), orders (cancel, order again, pay now, invoice), returns,
  wishlist, address book, wallet, notifications, guest tracking.
- **Links**: `src/app/+native-intent.tsx` maps website paths to screens.
- **Version gate**: the API answers 426 below `app_min_version`; the app shows "please update".

Not built / parked: push notifications (see §7), Urdu, iPhone build.

## 5. Running and building

```bash
npm install
$env:STORE="keryana"; npx expo start          # PowerShell; then open the dev build on the phone
npx tsc --noEmit                             # run both before every commit
npx expo lint
```

- **Expo Go** works for most screens; Google sign-in needs a **development build**.
- **Development build** (installed on the tester's phone): EAS build `c55378da`, package
  `pk.keryana.app` (the *old* id). A new one for `pk.recarta.com`:
  `NODE_OPTIONS=--use-system-ca STORE=keryana npx eas-cli@latest build --profile development --platform android --non-interactive`
- **Production build** (`.aab` for Play): build `e5c6637a` at commit `9ba4995`, started
  2026-10-29, was still queued when this was written. See it at
  https://expo.dev/accounts/looper575/projects/keryana-store/builds/e5c6637a-6894-40e0-bffa-0b7a7cf7c7d1
  ⚠ Build at commit `6c5c0bc` is the **old package** `pk.keryana.app` — never upload it to Play.
- EAS keeps both Android keystores (dev and `pk.recarta.com`); download a backup with
  `npx eas-cli@latest credentials`.

### This PC's quirks (Windows)

| Problem | Fix |
|---|---|
| `git push` fails "SSL certificate problem" | `git -c http.sslBackend=schannel push …` (network/antivirus TLS inspection) |
| EAS upload "ECONNRESET" / cert errors | prefix EAS commands with `NODE_OPTIONS=--use-system-ca` |
| Local Gradle can't download | `JAVA_TOOL_OPTIONS="-Djavax.net.ssl.trustStoreType=Windows-ROOT"`; raise `networkTimeout` in `android/gradle/wrapper/gradle-wrapper.properties` |
| Local Android build fails "Filename longer than 260 characters" | Windows long paths are off; **build on EAS instead** (don't change the system setting without the owner) |
| Typed routes say a new screen doesn't exist | the running `expo start` regenerates `.expo/types`; restart it. A folder with `index.tsx` + another file (e.g. `addresses/`) generated badly, hence `addresses.tsx` + `address-edit.tsx` |
| Global `expo login` | works for EAS too (`npx eas-cli whoami` → looper575) |

`android/` and `ios/` are generated (CNG) and git-ignored; never edit them by hand.

## 6. Play Store: where it stands and what's next

1. Wait for production build `e5c6637a`, download the `.aab`.
2. Play Console → Testing → **Internal testing** → Create release → upload the `.aab`. First
   upload must be manual. Keep **"Use a Google-generated key"** (Play App Signing); EAS's key
   becomes the upload key. Tester email list "Internal Testers" (press Enter after typing
   addresses so they're added).
3. Play Console → Test and release → **App integrity → App signing**: copy the **app signing**
   and **upload** SHA-1s → Google Cloud console → Credentials → **Android OAuth client** for
   `pk.recarta.com` with both SHA-1s (Google sign-in fails with DEVELOPER_ERROR without it).
4. **Store listing**: name (≤30), short (≤80) and full (≤4000) description, 512×512 icon,
   1024×500 feature graphic, 2–8 phone screenshots, category Shopping, contact email.
5. **App content**: privacy policy URL (needs a page on the site), app access (a dedicated test
   customer login for reviewers), ads: none, content rating questionnaire, target audience
   18+/13+, data safety (name, email, phone, address, purchase history, receipt photos;
   encrypted in transit; deletable), **account deletion web URL** (a site page explaining
   deletion), and the remaining declarations (government/financial/health/news: no).
6. If the Play developer account is **personal and created after Nov 2023**: a closed test with
   12+ testers for 14 consecutive days before production.
7. Production: country Pakistan, roll out, review (a few days).
8. Later versions: `eas submit` after the owner uploads a Google service account key to EAS.

**Still needed from the owner**: the real logo (square PNG ≥1024×1024, no transparency) for the
icon, adaptive icon and splash — the app still has Expo's placeholder icon.

## 7. Push notifications (parked)

Code is in place: the app registers an Expo push token (`src/lib/push.ts`, `POST /devices`),
forgets it on logout, opens an order when its notification is tapped; the server queues
`SendOrderStatusPush` on every `OrderStatusLog`. **Delivery doesn't work yet** because Android
needs Firebase: a Firebase project with an Android app `pk.recarta.com`, its
`google-services.json` wired into the config (`android.googleServicesFile`), and the FCM V1
service-account key uploaded to EAS by the owner (`eas credentials`). iPhone needs an APNs key.
The owner considered self-hosted delivery without Firebase (an in-app inbox + background check);
not built. Admin-composed promo pushes were proposed, not built.

## 8. Backend (Laravel) — done, and owed

Done and on `master`: Phase 1 shared services (`CartService` stores, `CartStockGuard`,
`DiscountCodeService`, `CheckoutService`, order services), the `/api/v1` API with Sanctum,
named rate limits, `OrderAccess` (who may see a full order; signed links in emails and the
API's `invoice_url`), PayFast callback hash check. Schema: `docs/sql/2026_10_24_mobile_api_step1.sql`
(applied on the test server). UA Cart has the order-page and PayFast fixes (`c1b4c04`) but **no API**.

Owed on the server / by the owner:
- `.env`: `GOOGLE_APP_CLIENT_IDS=<web client id>` (and `APPLE_CLIENT_IDS=pk.recarta.com`
  later), then `php artisan config:clear`.
- Commit `composer.json` / `composer.lock` with `laravel/sanctum` (installed on the server only;
  a fresh `composer install` from the repo would break the site).
- `php artisan queue:restart` after deploys (push job).
- One small real PayFast payment: log must show `hash_matched: true`
  (`PAYFAST_VERIFY_CALLBACKS=log` is the escape hatch).
- `APP_URL` must equal the public address (incl. `:4343`) or signed order links fail.
- Stock locations: Warehouse 1 shows negative stock (sales posted there, purchases into
  Warehouse 2); fix with a transfer, adjustment, or "Cities served" on Stock Locations.
- Live domain on port 443 + `.well-known/assetlinks.json` / `apple-app-site-association` for app links.

## 9. Conventions

- Owner applies DB changes by hand: every schema change ships as `docs/sql/*.sql` (no foreign
  keys, safe to re-run) plus a matching migration.
- The Laravel app runs on the server only; give server test steps, don't rely on local artisan.
- Keryana ↔ UA Cart: mirror changes by editing in place, never copy files over.
- Commit only what the task touched; push only when asked; app repo is on `main`.
