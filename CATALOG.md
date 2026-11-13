# Feature 03 — Catalog directory

Implemented on `feature/catalog`. The landing page and existing authenticated
workspace shell are preserved. No new frontend dependencies are needed.

## Setup and routes

Apply backend migration `a03_catalog` and run `python -m app.db.seed_catalog` from
the backend's activated virtual environment. Keep existing Supabase and
`API_BASE_URL` configuration. Start the backend and frontend normally.

- `/markets`: responsive market directory and multilingual crop catalog.
- `/markets/[id]`: server-rendered market details with sources, review dates,
  location and coordinate-verification status; unknown IDs show a not-found state.
- `/api/catalog/crops` and `/api/catalog/markets`: cookie-authenticated, read-only
  bridges to the corresponding FastAPI lists.
- `/api/catalog/crops/[id]` and `/api/catalog/markets/[id]`: read-only detail bridges.

The bridges validate IDs, whitelist forwarded query parameters and validate backend
responses with Zod. Errors preserve safe 401/403/404/422 statuses; service/network
or malformed-response failures become 503. Bearer tokens stay server-side. Existing
Supabase proxy/session refresh now also covers catalog API paths. Mutations are
not exposed. The workspace page protection and first-login onboarding are retained.

Search markets by name, town or district; filter by district. Search crops in
English, Sinhala or Tamil; filter by category. Submit search with Enter or the
Search button. Filter changes reset pagination. Results include a total and
Previous/Next controls. Both lists handle loading with the shared `Loader` via
`LoadingState`, successful results, empty data, service errors and retries.
Menus use `select.tsx`, search fields use `input.tsx`.

The initial dataset has four crops and three markets. Market details expose the
source descriptions and review dates. Initial market coordinates remain null
because exact sites were not verified, so no invented map pins are shown. Source
review does not establish today's opening hours. Prices, routing and recommendations
are outside this feature; the existing separate agent demo is unchanged.

## Reusable selectors

Import `CropSelector` or `MarketSelector` from
`@/features/catalog/components/catalog-selectors` in future client forms. They
require the existing app QueryClientProvider (already installed globally).

```tsx
const [cropId, setCropId] = useState<string | null>(null);
<CropSelector id="crop" label="Crop" value={cropId} onValueChange={setCropId} required />
```

Both accept `id`, optional `name`, `label`, controlled `value`, `onValueChange`,
`disabled`, and `required`. Values are stable string catalog IDs, not display names.
Selectors provide server search, active-only options, pagination, loading/error/empty
states and optional clearing. Selected labels are resolved by ID even when a search
or page excludes the current selection. Inactive/unavailable records cannot be newly
selected. Existing profile preferred-ID storage is unchanged.

## Files changed

- `src/features/markets/components/markets-page.tsx`: replaces the placeholder.
- `src/app/(workspace)/markets/[id]/page.tsx`, `not-found.tsx`, and
  `src/app/(workspace)/markets/loading.tsx`: details and route states.
- `src/features/catalog/schema.ts`: shared types, safe query encoding, Zod checks.
- `src/features/catalog/hooks.ts`: React Query hooks and safe API-error handling.
- `src/features/catalog/bridge.ts`, `server.ts`: authenticated backend access.
- `src/features/catalog/components/catalog-controls.tsx`, `catalog-selectors.tsx`:
  reusable filters, pagination and selectors.
- `src/app/api/catalog/[kind]/route.ts`, `[kind]/[id]/route.ts`: GET-only bridges.
- `src/lib/auth/profile.ts`, `src/proxy.ts`: reuse backend forwarding and refresh.
- `tests/catalog.test.mjs`: encoding, ID validation, provenance and response checks.
- `e2e/catalog.spec.ts`: authenticated directory/search/filter/detail/reload,
  unknown-ID, empty-result, outage/retry and anonymous API scenarios.
- `README.md`, `CATALOG.md`: feature/setup documentation.

## Validation

| Command | Actual result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 4 test files |
| `npm run build` | Blocked: Turbopack CSS worker cannot bind a sandbox port (`EPERM`) |
| `npm run test:e2e -- --list` | 9 tests discovered, including 2 catalog tests |
| `npm run test:e2e -- e2e/catalog.spec.ts` | Blocked: configured local server cannot start in sandbox |

Live UI behavior and a completed production build still need verification locally.
No browser test is claimed to have passed.

## Manual verification

1. Migrate/seed the backend and start both apps. Sign in and finish onboarding.
2. Open Markets from the sidebar. Confirm three market cards and four crop cards.
3. Filter by Matale, search for Meegoda and try a search with no results. Clear
   filters to restore the directory.
4. Filter crops by Root vegetables, then use All categories and search for
   `தக்காளி`. Confirm English, Sinhala and Tamil names display correctly.
5. Open a market, reload, inspect provenance links and the unverified-coordinate
   message. Check `/markets/no-such-market` and the Back to markets link.
6. Check keyboard navigation, narrow/mobile layouts and search submission by Enter.
7. Stop/block the backend after the workspace is open and retry a directory query;
   confirm an error with Try again, then restore service and retry successfully.
8. Sign out; protected pages redirect to login and unauthenticated bridge calls
   return 401 with the provider configured.
9. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` locally.
10. Set `E2E_FARMER_EMAIL` and `E2E_FARMER_PASSWORD` for a confirmed disposable
    account, then run `npm run test:e2e -- e2e/catalog.spec.ts`. The flow creates
    required-only onboarding details if this test account has no profile.
