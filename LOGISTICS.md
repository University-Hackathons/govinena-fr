# Feature 06 — Transportation estimates in the produce flow

Implemented on `feature/logistics`. Existing landing page, dashboard layout and
other features are preserved. No AI reasoning or recommendation integration is added.

## Setup

Apply backend migration `a06_logistics` and seed the existing catalog if needed:

```bash
# From the backend with its virtual environment active:
alembic upgrade head
python -m app.db.seed_catalog
```

The backend's current `.env` contains the invalid literal admin placeholder
`YOUR_VERIFIED_USER_UUID`. Replace it with a real verified UUID, or set
`GOVINENA_ADMIN_USER_IDS=[]` to disable admin price imports. This must be corrected
before normal backend startup/migrations. Tests here used an empty allowlist override;
the actual local file was not edited.

For optional automatic routing, configure **`govinena-bk/.env`**, then restart it:

```dotenv
MAP_PROVIDER=mapbox
MAPBOX_ACCESS_TOKEN=YOUR_SERVER_DIRECTIONS_TOKEN
GOVINENA_ROUTING_ALLOW_MAPBOX_CACHE=false
GOVINENA_ROUTE_CACHE_TTL_SECONDS=300
```

The existing frontend `.env.local` Mapbox token alone does not enable backend
Directions. No additional frontend token or dependency is introduced. Manual routing
and known quotes work with backend `MAP_PROVIDER=manual` (the default), without a
routing key. Existing `API_BASE_URL` and Supabase cookie-session configuration remain.

The initial market catalog has no verified coordinates. Those markets require a
manual distance or quote until operators add verified locations through the catalog
workflow. The feature never guesses a market pin from its town/district.

## Produce detail workflow

An owned produce detail page now includes a Transportation cost card with:

- The current batch quantity and source location.
- Reused searchable market selector and profile transport mode/capacity/km rate.
- One-way or outbound-plus-return distance pricing.
- Explicit permission for multiple deliveries when capacity is insufficient.
- Optional manual road distances/durations and an explicit equal-return assumption.
- Base, km-rate, loading, unloading, toll and handling inputs in LKR.
- An optional known quote and description covering the whole batch and all deliveries.
- Route source, outbound/return km and minutes, capacity loads and cost breakdown.
- Recent saved assumptions shown as readable labels/values, retained after refresh.

React Hook Form and Zod validate inputs, with backend ownership/calculation validation
remaining authoritative. Inputs use shared Input/Select/Checkbox components. Loading
uses the shared Loader; submissions use Sonner success/info/failure feedback. Error
states retain entries. Editing inputs after a result marks it as needing recalculation.

The profile's mode/capacity/rate are initial values only. Calculation changes do not
silently update the farmer profile. Blank km rate uses the profile rate if available;
otherwise a distance alone is insufficient and the API asks for a rate or quote.
Flat fee defaults are explicit zero-charge assumptions and can be edited. No live
vehicle fare or agricultural data is seeded.

Distance values may be an API estimate, user input, or unavailable. Durations may
remain unknown. A missing route is not shown as zero distance or a free journey.
Known quote zero is still an explicitly entered quote, not missing data. A quote
replaces the selected total, while a calculable component breakdown remains visible.
The UI labels both sources and never claims the map API supplies a vehicle fare.

One-way pricing uses outbound kilometers; return pricing uses a distinct return
leg when Mapbox is available. Manual users provide a return distance or explicitly
select equal outbound/return distances. Equal distance does not invent return time;
a separately known duration can be entered. Durations are leg travel estimates,
not total elapsed batch-delivery/waiting/loading schedules.

All flat fees apply once per delivery. Toll/handling inputs should cover the selected
vehicle billing basis. Capacity is required even with a quote; oversized loads need
explicit multi-delivery permission (maximum 100 trips). Known quotes cover the
whole batch, so they are not multiplied by delivery count.

Archived batches have no new-estimate form; existing assumptions remain available.
The source quantity, locations, charges, capacity and trip inputs are snapshotted;
subsequent profile/batch changes do not rewrite prior records. The latest 20 records
are shown. Mapbox output/derived calculated totals are not durably retained; input
assumptions and user quotes are retained. Manual calculations can retain their results.

## Backend and bridge contracts

- `POST /api/v1/logistics/estimate` via frontend `POST /api/logistics/estimate`.
- `GET /api/v1/logistics/estimates?batch_id=UUID` via frontend GET bridge.

Bridges use existing server-held bearer credentials, private/no-store responses,
body bounds and same-Origin mutation checks. Session refresh covers logistics API
paths. History query keys include the verified owner ID. Foreign batch IDs return
404, anonymous calls 401, archived/new-estimate attempts 409, invalid inputs 422,
and storage failures safe 503. A routing failure normally returns a labeled
manual fallback or `needs_input` with null cost, rather than a fabricated estimate.
Successful estimates use the backend's Decimal/ROUND_HALF_UP calculator.

Mapbox route responses are not cached by default because standard product terms
restrict storage. User-input route values use a bounded TTL cache; Mapbox caching
requires an operator agreement allowing it and an explicit backend flag. The UI
marks cache hits. No provider geometry/token/response is stored in the browser's
localStorage or persisted with assumptions. API results remain transient page state.

## Files changed

- `src/features/logistics/schema.ts`: typed form/API schemas, payload construction,
  profile defaults and correct LKR formatting.
- `src/features/logistics/bridge.ts`, `src/app/api/logistics/[action]/route.ts`:
  authenticated, bounded, same-Origin API forwarding.
- `src/features/logistics/components/transport-estimator.tsx`: calculation form,
  route and cost result, quote override, read-only recent assumptions and states.
- `src/app/(workspace)/produce/[id]/page.tsx`: loads profile defaults and inserts
  the estimator inside the existing batch detail page.
- `src/lib/auth/profile.ts`, `src/proxy.ts`: reuse forwarding/session refresh.
- `src/components/states/error-state.tsx`: retry is explicitly a button so it does
  not accidentally submit an enclosing transport/selector form.
- `tests/logistics.test.mjs`: defaults, quantity/cost inputs, return assumptions,
  quote zero, absent route values and LKR formatting.
- `e2e/logistics.spec.ts`: mobile produce creation/transport, missing route,
  capacity, round-trip pricing, quote, refresh history and archive retention;
  anonymous and cross-Origin rejection.
- `README.md`, `LOGISTICS.md`: setup and manual verification.

## Actual checks

| Command/check | Outcome |
| --- | --- |
| `npm run lint` | Passed (rerun after a transient concurrent test-results directory race) |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 7 test files |
| `npm run test:e2e -- --list` | 16 tests discovered, including 2 logistics tests |
| `npm run test:e2e -- e2e/logistics.spec.ts` | Blocked: sandbox prevents the local server binding a port |
| `npm run build` | Blocked: Turbopack CSS worker cannot bind a sandbox port (EPERM) |

Backend full-suite results are recorded in the backend guide. SQLite migration and
PostgreSQL SQL generation checks passed. The configured PostgreSQL connection is
unreachable here even after bypassing the invalid admin setting for the check.
Live Mapbox requests, browser rendering and a completed production build remain
unverified; no browser test is claimed to have passed.

## Manual verification

1. Correct the admin placeholder, migrate/seed and start both apps. Sign in and
   complete a farmer profile. Add an available 100 kg batch.
2. Open batch details and select a destination market. Confirm source/quantity and
   profile-derived capacity/rate/mode are displayed/editable as appropriate.
3. Set capacity 40 kg and try estimating. The API should reject the unsupported
   load until **Allow multiple deliveries** is checked.
4. Use manual outbound distance 10 km, one-way pricing, base 300 LKR, rate 20 LKR/km,
   and zero other fees. Three deliveries should cost **1,500 LKR**.
5. Change to outbound/return pricing and enter return distance 15 km. The result
   should be **2,400 LKR**, with source labeled manual user input.
6. Try the equal-return checkbox after clearing explicit return distance, including
   a separately known return duration. Confirm the equal-distance assumption label.
7. Enter a whole-batch quote 700 LKR with description. Selected total must be
   **700 LKR**, not 700 per trip. Refresh and inspect the saved snapshot.
8. With automatic mode and no usable coordinates/manual distance, verify helpful
   needs-input messaging and unknown distance/time. Use a quote to complete without
   inventing a route. Test negative values and missing quote description.
9. If valid backend Directions configuration and verified market coordinates are
   available, compare API outbound/return results. API-derived outputs should not
   reappear as stored route history after refresh.
10. Confirm another user's batch ID cannot be estimated or queried. Archive this
    batch; new calculations disappear while stored assumptions remain readable.
11. Check a 390 px viewport: form grids, selectors, fees, result breakdown and saved
    input details should remain usable. Recommendations remain disabled.
12. Run the full frontend checks/build locally. Set `E2E_FARMER_EMAIL` and
    `E2E_FARMER_PASSWORD` to a confirmed disposable account, then run
    `npm run test:e2e -- e2e/logistics.spec.ts`. The test creates and archives its
    batch while retaining saved transport snapshots; it requires no Mapbox token.
