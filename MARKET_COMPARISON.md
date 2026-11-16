# Feature 08 — Deterministic market net-return comparison

Both repositories use `feature/market-comparison`. Existing landing/workspace layouts, Supabase authentication, produce management, routing and crop-risk features are preserved. No LLM or LangGraph participates in a comparison.

## Farmer flow

On `/produce/{id}`, **Compare Markets** provides:

- Explicit price-type and known-storage selection; an optional, initially unchecked no-loss scenario.
- Shared vehicle capacity, distance pricing and per-delivery charges, prefilled from the profile where available.
- One to twenty searchable candidate markets using the existing MarketSelector. Each can have manual distance/duration, a return distance, a whole-batch quote, a quote description, explicit final arrival and additional whole-batch market fees.
- Ranked cards with saleable quantity, recorded price, gross revenue, costs, net proceeds, arrival, freshness, source/import/publication timestamps, risk explanations and cost breakdowns.
- Explicitly excluded alternatives, loading, empty, retry/error and Sonner success/informational feedback. Negative net proceeds remain visible.

Leaving distance blank attempts configured routing. An unknown route does not become zero distance or time. A quote without route duration requires an explicit arrival. Multiple deliveries require explicit final arrival because repositioning and sequential-trip delays are not inferred. Quotes replace all calculated transport fees; additional market fees must exclude anything already covered by the quote or tariff. Blank flat charges assume zero and are labelled as scenario assumptions.

A result is an **observed-price scenario**, not a known future sale or predicted price. The saved batch deadline remains a hard limit. Loss rules are unvalidated operator assumptions; when no selected storage rate exists, a market is excluded unless the farmer explicitly chooses the no-loss scenario. That choice never overrides a hard deadline.

Private persisted results put `?comparison=<uuid>` in the produce detail URL. Refresh restores that historical result. Form settings are new scenario inputs and are not silently reconstructed or saved to the batch. Editing them displays a recalculation notice. Mapbox-derived results are not persisted; they cannot be restored after refresh. Sold/archived batches show historical snapshots but no comparison form.

## Frontend files

Added:

- `src/features/comparisons/schema.ts`: typed response validation, candidate/fee validation and exact Decimal-string LKR formatting (including large totals and negative net amounts).
- `src/features/comparisons/bridge.ts`: authenticated backend bridge, same-origin POST protection, request size limit, schema validation and private/no-store responses.
- `src/features/comparisons/components/market-comparison.tsx`: controls and responsive ranked/excluded result cards.
- `src/app/api/comparisons/route.ts` and `src/app/api/comparisons/[id]/route.ts`.
- `tests/comparisons.test.mjs`, `e2e/comparisons.spec.ts`.

Updated produce detail integration, backend path typing in `src/lib/auth/profile.ts`, and cookie-refresh matching in `src/proxy.ts`. No new packages or frontend environment variables are required. Shared Select, Input, Checkbox, state components, logistics form validation and payload generation are reused.

## Manual verification

1. Correct the backend admin UUID placeholder if still present: use `GOVINENA_ADMIN_USER_IDS=[]` or real allowlisted UUIDs. Apply migration `a08_comparisons`; seed the existing catalog if needed. Start backend and frontend normally.
2. Use the existing admin CSV importer to import genuinely verified, recent wholesale observations for the batch crop and **matching grade** at at least two markets. The bundled historical sample may correctly be rejected as stale; do not relabel old observations as current.
3. Create a 100 kg tomato batch, harvested earlier today and with a future farmer deadline. Open its detail page and select the two candidate markets. Enter a suitable vehicle capacity.
4. Supply each market's real known distance/duration or quote plus explicit arrival. Add only fees not already covered by transport. Configure reviewed crop/storage rules through the existing crop-risk API, or explicitly select the no-loss scenario for this calculation.
5. Click Compare Markets. Verify descending net order, different transport overrides, source timestamps, cost breakdown and assumptions. Verify `gross - transport - additional market fees = net`. Zero prices and negative net proceeds must remain distinct from missing values.
6. Reload the saved result URL and verify it is labelled historical. Change a quote and recalculate. Confirm the earlier result is not silently presented as updated.
7. Set arrival at/after the deadline; compare and check its exclusion. Try absent/stale prices, a mismatched grade, no loss setting, missing route duration and multiple deliveries. Each blocked option must explain the missing or unsuitable data.
8. Use a narrow viewport and keyboard controls. Simulate `/api/comparisons` returning 503 and confirm inputs remain available with failure feedback. A second farmer cannot retrieve the first farmer's snapshot.

## Checks

Commands run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- e2e/comparisons.spec.ts
```

Lint/type checking passed and all nine Node test files passed. Default Turbopack build was blocked by sandbox worker-port binding (`EPERM`). The fallback production check uses webpack and a temporary `experimental.useTypeScriptCli=false` setting to avoid this sandbox's empty TypeScript child-process output; the original Next config is restored after the command. That fallback production build passed, including TypeScript and static generation. The original Next config was restored.

Playwright was attempted but could not start the local server (`listen EPERM` on port 3000). No browser test is claimed as passed. Its main flow requires `E2E_FARMER_EMAIL`, `E2E_FARMER_PASSWORD`, a disposable migrated test backend/catalog, and fresh verified **ungraded wholesale tomato** prices at Dambulla and Meegoda. Set `E2E_COMPARISON_FRESH_PRICES=1` only after preparing those observations. The test creates/archives a disposable batch, checks ranking/quotes/snapshot refresh, deadline exclusion, mobile width and a simulated service failure. A separate browser test covers anonymous and cross-origin API writes. Traces, videos and screenshots remain disabled around authentication.

No fabricated live crop prices or credentials were added. Backend formulas, exclusions, API contracts, migration details, snapshot retention and financial test results are documented in the backend's `MARKET_COMPARISON.md`.
