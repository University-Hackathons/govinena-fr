# Feature 05 — Market prices frontend

Implemented on `feature/market-prices`. The existing landing page and workspace
layout are preserved. No extra packages or browser-visible admin secrets are needed.

## Setup

Apply backend migration `a05_market_prices` and seed the existing crop/market
catalog. Keep existing Supabase and `API_BASE_URL` configuration. Admin imports are
denied by default; configure verified provider user UUIDs in **the backend `.env`**:

```dotenv
GOVINENA_ADMIN_USER_IDS=["YOUR_VERIFIED_USER_UUID"]
GOVINENA_PRICE_STALE_AFTER_HOURS=72
```

Replace the placeholder with the ID from the existing authenticated `/api/users/me`
frontend endpoint, then restart the backend. Do not use email/session IDs or add
this list to `NEXT_PUBLIC_` variables. An empty list `[]` denies imports. The
backend remains authoritative if an account's permissions change while the UI is open.
Normal onboarding still applies to admin UI accounts because the existing workspace
layout/guard is preserved.

## Pages and behavior

- `/markets/prices`: accessible via **View market prices** on the market directory.
  It contains crop/market selectors, an explicit wholesale/retail/farmgate selector,
  optional exact source/quality filters, latest observations, freshness/coverage,
  market comparison, historical Recharts lines and the underlying data table.
- `/markets/prices/import`: server-checked admin-only upload page. The import link
  is only shown when the verified backend capability permits it. Direct non-admin
  visits do not render the import form; the API also rejects unauthorized imports.
- `/api/prices/[...path]`: whitelisted server bridges for latest/history/comparison/
  freshness/access and import/audit/original-file endpoints. Unsupported writes are
  unavailable; raw CSV imports require same-Origin requests and a bounded 1 MiB body.

Bearer credentials remain server-side. Existing Supabase session refresh now covers
price API paths. Browser query keys include the verified user ID; role/audit state
is not reused across accounts. Responses are private/no-store. The server forwarding
helper supports raw ArrayBuffers and CSV content types without changing existing
JSON requests. CSV forwarding allows a 120-second request timeout; exact-file
retries remain idempotent if a slow response cannot be confirmed.

Latest prices are per source/grade/type rather than an unlabelled blend. Missing
prices display **Not reported**, and a source-reported zero displays a zero amount.
The table shows observation dates/times, precision, source, publication date and
freshness. A new import timestamp does not make an old observation recent.
Latest/freshness/comparison queries refresh about once per minute while open.

History requires a crop and market. It defaults to the last 30 days; explicit date
filters preserve Sri Lankan calendar days. Choose **2025-12-29 to 2025-12-30** to
inspect the included historical sample. Chart streams keep sources/grades separate,
use nulls for absent days, preserve explicit zero and do not connect through missing
values. The source table is the accessible data equivalent. Data limits are explicit:
history responses flag truncation, and the chart warns when showing 12 of more than
12 streams. Refine source/quality/date filters to inspect a larger selection safely.
No recommendation, average or price forecast is generated.

## Import workflow

Download the historical sample from the import page, or prepare a CSV using its
header. The full contract is in the backend `MARKET_PRICES.md`.

- UTF-8 CSV, at most 1 MiB / 2,000 data rows.
- Explicit crop/market IDs, LKR amount, unit and unit quantity.
- Supported units: kg, g, tonne. A bag is only represented through its verified mass.
- Source name and URL/document reference are required. Exact publication timestamps
  stay empty when unknown; publication dates remain explicit.
- Enter either observation date or exact timezone-aware timestamp, never both.
- Blank/NA prices are missing; an explicit 0 is reported zero.
- A verification note and operator source-review checkbox are required.

Success uses Sonner. Partial failures receive a warning and row-level audit results;
transport/permission failures receive clear errors and retain the selected file/note.
The results include accepted/duplicate/rejected counts, logical CSV row numbers,
safe error codes, original fields and a download of the exact original upload.
Exact-byte replays show the original report without writing new observations.

The sample has 16 Dambulla observations for four crops, wholesale/retail on 29–30
December 2025, transcribed from the official CBSL 30 December 2025 report's page-2
Yesterday/Today columns. It is historical and should be marked outdated. It is
provided as a fixture/template and is never imported automatically. Values were
checked against the official indexed table; direct PDF retrieval returned 403 in
this environment. The importing admin must review the cited original publication.
No scraper or access-control bypass is included.

## Files changed

- `src/features/market-prices/schema.ts`: typed responses, validation, formatting,
  query encoding and bounded gap-aware chart shaping.
- `src/features/market-prices/hooks.ts`: account-scoped data loading and safe errors.
- `src/features/market-prices/bridge.ts`: whitelisted authenticated JSON/CSV/file forwarding.
- `src/features/market-prices/components/prices-page.tsx`, `price-table.tsx`,
  `history-chart.tsx`, `import-prices.tsx`: data-driven dashboard, source display,
  Recharts history and admin import/audit interface.
- `src/app/(workspace)/markets/prices/page.tsx`, `loading.tsx`, `import/page.tsx`:
  protected price pages and server-side import access check.
- `src/app/api/prices/[...path]/route.ts`: GET and admin CSV POST bridge.
- `src/features/markets/components/markets-page.tsx`: directory entry link.
- `src/lib/auth/profile.ts`, `src/proxy.ts`: reuse server forwarding and cookie refresh.
- `public/samples/verified_prices_sample.csv`: historical source-backed CSV fixture.
- `tests/market-prices.test.mjs`: zero/missing, safe values, query separation,
  day precision, chart gaps, series limits and date bounds.
- `e2e/market-prices.spec.ts`: mobile admin import/replay/audit/download, type/filter/
  history and outage flow; normal farmer and anonymous permission checks.
- `README.md`, `MARKET_PRICES.md`: setup and verification.

## Actual validation

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 6 test files |
| `npm run test:e2e -- --list` | 14 tests discovered, including 3 price tests |
| `npm run test:e2e -- e2e/market-prices.spec.ts` | Blocked: local test server cannot bind a sandbox port |
| `npm run build` | Blocked: Turbopack CSS worker cannot bind a sandbox port (`EPERM`) |

The backend suite passed 244 tests using the established sandbox selector workaround.
SQLite migration checks passed, and PostgreSQL SQL generation passed. The configured
PostgreSQL migration failed due to connectivity/DNS. Live provider/browser execution
and the completed production build remain unverified. No browser test is claimed to
have passed.

## Manual verification

1. Migrate/seed the backend and configure an admin provider UUID. Restart both apps.
2. Sign in as admin, complete onboarding, open Markets → View market prices and
   confirm **Import prices** is available.
3. Review/download the historical sample, select it, enter a verification note,
   check the source-review checkbox and import. Expect 16 accepted rows initially,
   or a replay report if this exact file was already imported.
4. Expand row audit details and download the original file. Re-upload the same
   file and verify no new observations are written.
5. Filter Tomato and Dambulla. Wholesale latest should be 345 LKR/kg; Retail should
   be 375. Both are dated 30 December 2025 and marked outdated.
6. Apply history dates 2025-12-29 through 2025-12-30. Wholesale is 375→345 and Retail
   is 405→375. Check source/grade labels, chart/table values and missing-day gaps.
7. Clear the market filter to compare active catalog markets for the crop. Markets
   with no observations must show missing data rather than zero or copied prices.
8. On a disposable database, import invalid/negative/conflicting rows and verify
   rejection audit. Import blank and explicit-zero rows and confirm they differ.
9. Sign in as a separate non-admin farmer. Import controls must be absent; direct
   import/audit/file API attempts return 403. Anonymous price APIs return 401.
10. Block/stop the backend with the page open. Reads/imports should show errors;
    restore service and retry. Retrying the identical CSV is safe after timeouts.
11. Check mobile filter controls, horizontal table scrolling, chart and upload form.
12. Re-run lint, typecheck, unit tests, production build and Playwright locally.
    Use `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` for an allowlisted confirmed account,
    and `E2E_FARMER_EMAIL` / `E2E_FARMER_PASSWORD` for a separate non-admin account.
    The test completes required-only onboarding when needed and intentionally
    retains the historical import as an audit record.
