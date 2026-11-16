# Feature 07 — Produce freshness and selling urgency

Branch: `feature/crop-risk`. Existing layouts, authentication and transportation flow are preserved. No forecasting or AI recommendations are added.

## Changes

- `src/features/crop-risk/schema.ts`: typed response validation, known storage choices, coarse time/quantity formatting; null never becomes zero.
- `src/features/crop-risk/components/crop-risk-assessment.tsx`: mobile-ready produce detail panel; automatic initial assessment and minute refresh, optional expected arrival, shared Select/Input controls, loading, missing-guidance, error/retry and changed-settings states, Sonner feedback and explanatory rule versions.
- `src/app/api/crop-risk/evaluate/route.ts`: authenticated server bridge using existing cookies/backend client; origin checks, size limit, response validation and no-store headers.
- Existing `src/app/(workspace)/produce/[id]/page.tsx`, `src/lib/auth/profile.ts`, and `src/proxy.ts`: panel integration and authenticated API routing.
- `tests/crop-risk.test.mjs`: null/zero distinction, invalid responses, coarse display boundaries.
- `e2e/crop-risk.spec.ts`: mobile batch creation, storage/arrival selection, deadline rejection, reload, service failure, and anonymous/cross-origin checks.

The batch's deadline is visibly labelled farmer input; the crop selling window is labelled operator guidance. Loss estimates are rounded for display and explicitly described as assumption arithmetic, never validated predictions. Missing rules still permit deadline assessment. Missing storage rates display unknown. Late arrivals and sold/archived batches show rejected alternatives. Scenario settings are not persisted to the batch. The panel shows the last assessment time so minute refresh does not imply a continuous countdown.

## Setup and manual checks

1. Apply backend migration `a07_crop_risk`; retain existing Supabase and API environment setup. No new frontend environment variables or packages are required.
2. Correct the backend admin UUID placeholder to `[]` or a JSON list of actual admin UUIDs. Use the authenticated backend profile endpoints to configure reviewed assumptions; see backend `CROP_RISK.md` for complete rules, formulas and versioning.
3. Sign in and open `/produce`, create a batch, then open `/produce/{id}`. Check remaining time and separate farmer deadline/operator guidance labels.
4. Change known storage, update, and inspect the selected condition and assumptions. When that condition lacks a rate, quantity must be unknown. Open “How this assessment works”.
5. Enter arrival before, then at/after the hard deadline (Sri Lanka time), updating each time. Verify rejection and high urgency for the latter. The stored deadline is never extended.
6. Reload to verify the authoritative batch persists and scenario inputs reset. Test a passed deadline, sold/archived batch, narrow viewport, keyboard Select controls, and a blocked risk API with retry.

## Commands and environment limitations

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- e2e/crop-risk.spec.ts
```

Lint, type checking and all eight Node test files passed. Default Turbopack build was blocked by the sandbox's worker-port binding restriction. Webpack with the default TypeScript CLI then failed because the sandbox returned empty child-process output for `tsc --showConfig`. A complete production webpack build passed with temporary `experimental: { useTypeScriptCli: false }`; `next.config.ts` was restored unchanged immediately after that check. This workaround is not a production configuration change.

Playwright was attempted but its web server could not start (`listen EPERM`, local port 3000). No browser test is claimed as passed here. The authenticated main-flow test also requires `E2E_FARMER_EMAIL` and `E2E_FARMER_PASSWORD` for a disposable confirmed account, migrated database and catalog seed; those credentials are not configured in this session. On a local machine, start the backend and run the command above with those variables in the process environment. Tests disable traces, video and screenshots to avoid recording credentials.
