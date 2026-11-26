# Feature 09 — Farmer recommendation workflow

Implemented on `feature/ai-agent`, preserving the landing page, authenticated layout and existing comparison flow.

## Pages and controls

- An **available** produce batch offers Generate Recommendation at `/produce/{id}`.
- `/recommendations/new?batch={id}` reuses existing transport/candidate/storage controls, with a five-market limit. Quotes with explicit final arrival can be used without retained provider-route output.
- `/recommendations/{run_id}` polls queued/running status, displays the selected market and exact tool-derived net, alternatives, freshness/source timestamps, warnings, an actual tool-call timeline and concise workflow stages.
- Missing-input/failed runs offer Modify Constraints and resume. Completed/accepted/rejected runs create a new run when constraints are modified, preserving the earlier decision.
- Accept and Reject record decisions only. They never sell produce, transfer funds or book transportation. Expired/changed scenarios cannot be accepted.
- `/recommendations` lists the farmer's runs with pagination and existing loading/empty/error components.

The mode label distinguishes deterministic mock-agent runs (real data/tools, no LLM) from LLM-assisted planning/explanation. Every numeric value remains sourced from the deterministic comparison. Existing comparison cards show price sources, observation/publication/import timestamps, quantity/cost assumptions, risk rules and excluded alternatives. The explanation cannot invent numeric facts.

## Files

Added:

- `src/features/recommendations/schema.ts`: typed run/status/trace validation and display labels.
- `src/features/recommendations/components/run-detail.tsx`: status polling, approvals, recovery, input requests and activity timeline.
- `src/app/(workspace)/recommendations/[id]/page.tsx`, `src/app/(workspace)/recommendations/new/page.tsx`.
- `src/app/api/agent/[...path]/route.ts`: existing authenticated backend client, allowlisted paths/actions, same-origin writes, request-size checks and private/no-store responses. It does not forward synthetic demo or arbitrary agent actions.
- `tests/recommendations.test.mjs`, `e2e/recommendations.spec.ts`.

Updated the recommendation-list placeholder, produce-detail action, authenticated backend path type/proxy matching, and the shared MarketComparison component. That component now exports its existing result view and accepts optional agent mode/initial constraints/resume context; the original Feature 08 behavior remains the default. All controls continue to use shared Select/Input/Checkbox/Button components. No new packages or frontend API keys were added.

## Setup and manual verification

1. Apply backend migration `a09_agent`. Keep existing Supabase/API settings. Backend `GOVINENA_REASONING_MODE=mock` is the default and requires no OpenAI key. Correct the existing admin UUID placeholder before starting the backend if it is still present.
2. Prepare genuine fresh verified prices for the selected crop, grade and price type. Provide real transport inputs and reviewed storage-loss rules, or explicitly select a no-loss scenario. Historical sample prices may correctly be stale; do not relabel them as live data.
3. Create an available produce batch and click Generate Recommendation. Select at most five markets, confirm capacity and enter distance/duration or an all-deliveries quote plus final arrival. Start the run.
4. Watch status and actual tool activity. Confirm the selected market/net equal deterministic rank one and inspect alternatives, costs, risk assumptions and source freshness. Mock mode must be visibly labelled.
5. Omit required information or use stale prices. Verify the input request with no fabricated recommendation. Modify Constraints, correct the values and resume; the same paused run should continue from its database checkpoint and re-check current data.
6. Accept a completed result, reload and verify the approval persists. Modify its constraints to create a separate run, then Reject that run. Confirm no produce status, sale, payment or booking was created. Try acceptance after editing the batch or after the result expires; it must fail safely.
7. Restart the backend while a run is paused and verify resume works. For a forcibly interrupted running process, use Recover interrupted run after the lease expires (up to ten minutes). Queued work can also be re-dispatched. This is explicit recovery, not an automatic background-job broker.
8. Check the flow on a narrow viewport and with keyboard Select controls. Simulate API failure and verify form inputs remain available and feedback is understandable. A different farmer must not access the run.

Optional OpenAI planning/explanation uses **backend-only** `OPENAI_API_KEY`, `OPENAI_MODEL`, and `GOVINENA_REASONING_MODE=openai`. Do not expose these through `NEXT_PUBLIC_*`. The model is constrained to allowlisted tools and approved explanatory sentences; all prices and calculations still come from verified services. Unsupported/unavailable LLM output produces visible deterministic-fallback warnings. See backend `RECOMMENDATION_AGENT.md` for bounds and persistence details.

## Validation and limitations

Commands run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- e2e/recommendations.spec.ts
```

Lint, type checking and all **ten** Node test files passed. Default Turbopack build hit the sandbox's worker-port restriction. A complete webpack production build passed using a temporary compiler-API setting (`experimental.useTypeScriptCli=false`) to avoid this sandbox's empty TypeScript CLI child output; the original `next.config.ts` was restored unchanged.

Playwright was attempted but its local web server could not start in this restricted environment. No browser test is claimed as passed. The main mobile test requires disposable `E2E_FARMER_EMAIL`/`E2E_FARMER_PASSWORD`, a migrated backend in mock mode, the existing catalog and fresh verified ungraded wholesale tomato observations at Dambulla. Set `E2E_COMPARISON_FRESH_PRICES=1` after preparing those observations. It covers generation, tool order/result consistency, acceptance persistence, modified constraints, missing-input resume, rejection and mobile width. A separate test covers anonymous/cross-origin/unsupported API actions. Traces, screenshots and videos remain disabled around login credentials.

Durable agent recommendations require user-confirmed manual transport facts when provider retention rules prohibit saving derived Mapbox output. Raw provider output and hidden LLM reasoning are never shown as saved agent activity. The backend dispatcher is in-process; recovery after a hard restart requires the explicit recovery action. No live OpenAI request or live PostgreSQL migration is claimed as verified here.
