# Feature 02: farmer profile and preferences

Both repositories remain on `feature/farmer-profile`. No merge or push was performed. The existing landing page and workspace design remain intact. No produce-batch or recommendation logic was implemented.

## Files and behavior

- `src/features/farmer-profile/schema.ts`: shared Zod form validation, district options, normalization, payload conversion, response parsing, and persisted form defaults.
- `src/features/farmer-profile/server.ts`: server-only, request-scoped farmer-profile loader; treats 404 as missing setup and service errors as failures.
- `src/features/farmer-profile/components/profile-editor.tsx`: React Hook Form editor with personal, location, transport, and preference sections; saved completion state; loading, empty, validation, submission, success, error, and discard states. Uses existing shadcn components and `Loader.tsx`.
- `src/app/(workspace)/onboarding/page.tsx`: setup inside the existing shell. Existing profiles redirect to the dashboard. Required details can be saved without optional fields using “Skip optional fields”; any optional entries are cleared by that button.
- `src/app/(workspace)/profile/page.tsx`: edit persisted profile inside the dashboard shell, accessible from the sidebar and account menu.
- `src/app/api/farmer/profile/route.ts`: same-origin GET/PUT bridge. Provider tokens stay server-side. PUT checks Origin before cookie-authenticated mutation; errors use the standard envelope. FastAPI owns canonical typed input validation.
- `src/lib/auth/profile.ts`: extends the existing authenticated backend forwarding helper; provider network/rate-limit failures surface as service errors rather than signed-out state.
- `src/proxy.ts`: protects `/profile` and `/onboarding`, refreshes cookies for the bridge, and redirects users missing a farmer profile to onboarding before entering other workspace pages. No global cache stores private profile data. Profile/onboarding are exempt from the setup redirect to avoid loops.
- `src/config/navigation.ts`, `src/components/app-sidebar.tsx`: profile links while retaining the current layout.
- `tests/farmer-profile.test.mjs`: required/optional validation, normalization, decimal responses, and form hydration.
- `e2e/farmer-profile.spec.ts`: authenticated setup/edit/reload flow, negative input rejection, a simulated save outage, and anonymous API rejection. Existing auth tests accept onboarding as the post-login destination for new users.

No dependency additions are needed. React Hook Form, Zod, the resolver, Supabase SSR, and Playwright were already installed.

## Run and manually verify

1. Keep the existing Supabase auth and backend configuration. In `govinena-bk`, run `.venv/bin/alembic upgrade head` against your configured PostgreSQL database, then start FastAPI. This environment could not reach that database, so the application migration still needs to run locally.
2. In this frontend directory, run `npm run dev`. Use a new confirmed account from Feature 01. After login or email confirmation, the dashboard redirects to `/onboarding`.
3. Submit an empty form. Check the full-name, district, and town errors and keyboard focus. Enter the required details, choose a district/language/transport mode, and use “Skip optional fields”. This saves the core profile, shows a success toast, and opens `/dashboard`.
4. Open “Farmer profile” from the sidebar or account menu. Confirm the saved name, district, town, language, and transport mode have loaded. Core setup is complete even if optional data stays empty; the progress label explains the 50% baseline and optional groups.
5. Enter a negative capacity/rate and try to save; both must fail validation. Zero capacity must also fail, while zero transport rate is valid. Test an invalid contact number, unknown district via the API, only one coordinate, and out-of-range coordinates.
6. Add a valid contact, optional approximate coordinate pair, capacity, and estimated rate. Save, reload, and verify values remain. The contact formatting is normalized and coordinates are rounded to 3 decimals. Clear optional inputs and save to remove them. Use “Discard changes” to restore saved values without writing.
7. Sign in as another account in a private window. It must see its own onboarding/profile. Account A must never see account B's values. The backend rejects a PUT body containing `user_id`; adding `?user_id=<B>` cannot change A's profile target.
8. Sign out and request `/api/farmer/profile` or the FastAPI endpoint without credentials; expect 401. Visit `/profile` while signed out; expect `/login`.
9. In a disposable environment, stop the profile/backend service. Initial profile loading must show an error rather than a blank profile. A failed save must show a safe error and retain entered values. Restore the service and retry.
10. Verify forms, navigation, labels, error messages, and the Loader at mobile width and with keyboard-only navigation. The landing page must remain unchanged.

District selection covers Sri Lanka's 25 districts. Town/village remains free text because there is no complete town catalogue. Coordinates are optional and never obtained automatically from the device. Preferred language is saved; this feature does not translate the interface. Market preferences can be left blank; no live catalogue is connected, and entered IDs are not checked for current market existence. Rate units are LKR/km and capacity units are kg.

## Test commands and actual outcomes

```bash
npm run lint
npm test
npx next typegen
npm run typecheck
npm run build
npm run test:e2e -- --list
npm run test:e2e -- e2e/farmer-profile.spec.ts
```

- Lint passed.
- All three unit-test files passed, including profile validation and hydration.
- Next route type generation and TypeScript passed.
- Production build was attempted but Turbopack failed while processing CSS because the sandbox cannot bind a local worker port (`Operation not permitted`). Production compilation and browser rendering are not confirmed.
- Playwright discovery passed: six tests across auth and farmer profile. The execution attempt could not start its development web server. A direct `npm run dev` reproduction returned `listen EPERM` on port 3000. No browser test passed or completed in this environment.
- Backend Ruff lint/format, repository/service/API tests, isolated SQLite migrations, and PostgreSQL SQL generation succeeded; see the backend guide for details. The configured PostgreSQL migration failed due to unavailable network/DNS.

For the main E2E flow, export `E2E_FARMER_EMAIL` and `E2E_FARMER_PASSWORD` for a **dedicated disposable confirmed user**. A fresh user exercises first-time onboarding; repeat runs exercise persisted editing. The test writes test profile values and leaves them on this disposable account. `E2E_BASE_URL` can target an already-running app. The signed-in test is skipped if credentials are absent; the anonymous test still needs the configured services. Do not record auth traces or screenshots containing secrets. Existing `E2E_EMAIL`/`E2E_PASSWORD` continue to cover authentication.

A successful production build, real PostgreSQL migration, and live-provider browser run remain required before merging or deploying.

## Mapbox location selection

In `govinena-fr/.env.local` (next to `package.json`, not inside `src`), add:

```dotenv
MAP_PROVIDER="mapbox"
MAPBOX_ACCESS_TOKEN="pk.your_public_mapbox_token"
```

Restart the Next.js development server after changing these values. Set the same
variables in the frontend hosting environment for deployment. The backend does
not need this token for saving profile coordinates. Use a public `pk.` token from
your Mapbox account; do not use a secret `sk.` token. The server explicitly passes
the public token to the browser for Mapbox GL JS. Restrict its allowed URLs to
your localhost development origin and production domain in Mapbox settings.

The map uses the official Mapbox-hosted GL JS 3.33.0 SDK and CSS. Your browser
must be able to reach `api.mapbox.com` and Mapbox tile services and support WebGL.
Map attribution and navigation controls are retained. Current location asks for
browser permission only when clicked; geolocation requires HTTPS or localhost.
Denied permissions, missing configuration, and map failures leave the required
profile fields usable. Location is optional and stored to three decimal places.

Both onboarding and profile editing use the shared `Select` for district,
transport and language, and `Input` for text/numeric fields. There are no editable
latitude/longitude fields. Farmers can click/tap to place a draggable pin, use
current location, select the map centre with the keyboard, or remove the pin.

Manual verification:

1. Configure the frontend variables and restart it. Open onboarding with a new
   account or `/profile` with an existing account.
2. Check district, transport and language menus; keyboard selection should work.
3. Click a location on the map, then drag its pin. Save and reload to see the
   persisted pin. Try **Discard changes** after moving it on the profile page.
4. Try **Use my current location** with location permission allowed and denied.
5. Use the map arrow keys and **Place pin at map centre** without a mouse.
6. **Remove location**, save and reload; verify no location is selected.
7. Leave Mapbox unconfigured or block its requests and verify required-only
   onboarding still succeeds using **Skip optional fields**.

The existing Playwright profile flow now selects the shared custom menus. Set
`E2E_MAPBOX_ENABLED=1` alongside the existing disposable-account variables to run
the additional live map/current-location/persistence flow.
