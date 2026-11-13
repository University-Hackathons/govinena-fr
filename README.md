# AgriMarket — GoviNena frontend

Feature 02 adds farmer profiles and preferences. See [FARMER_PROFILE.md](FARMER_PROFILE.md) for API contracts, migration steps, file changes, verification, and current environment limitations.

Reusable frontend foundation for an agentic AI-based Farmer Market Decision Support System for Sri Lanka. The public introduction remains at `/`. The application workspace has `/dashboard`, `/produce`, `/markets`, `/recommendations`, `/monitoring`, and `/settings`.

All workspace information is explicitly labeled as a preview. The dashboard uses local fixtures, not API fallbacks. There are no real agricultural prices, recommendations, or notifications. Account operations now use Supabase Auth and the FastAPI backend; see [authentication setup and verification](AUTHENTICATION.md).

## Local development

Use Node.js 24 LTS and npm. The app supports Node.js >=20.9; the lightweight TypeScript-source tests require native TypeScript support in Node.js 22.18+ (verified with Node.js 24.21.0).

```bash
cd /home/nipun/Desktop/innovaX/govinena-fr
npm install  # Refresh the lockfile for the new auth packages; see AUTHENTICATION.md
# If .env.local is absent after cloning:
cp -n .env.example .env.local
npm run dev
```

Configure Supabase and start the migrated backend as described in [AUTHENTICATION.md](AUTHENTICATION.md), then open http://localhost:3000/dashboard. Stop the server with Ctrl+C.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the production build. Stop the development server first if using the default port 3000. Install development dependencies during the build stage: Tailwind, TypeScript, and shadcn CSS compilation need them.

## Installed libraries

| Library | Purpose |
| --- | --- |
| shadcn/ui, Radix UI, class-variance-authority, cn, tw-animate-css | Owned component source, accessible primitives, variants, class composition, and animations |
| lucide-react | Consistent application icons |
| next-themes | Persisted light, dark, and system appearance |
| react-hook-form, zod, @hookform/resolvers | Ready for typed forms with schema validation; auth forms validate with Zod in Server Actions |
| axios | Shared HTTP client with timeouts and safe errors |
| @tanstack/react-query | Query cache, async loading states, cancellation-ready service boundaries |
| recharts | Responsive visualization; demonstrated using a synthetic index |
| date-fns | Ready for future date formatting; deliberately no invented freshness timestamps |
| sonner | Theme-aware toast host, ready for actual user actions |

The imported UI also uses `@base-ui/react`, `motion`, `gsap`, and `react-day-picker`. Existing Radix components remain supported alongside Base UI.

Next.js 16.4.5, React 19.3.0, Tailwind 4.3.4, TypeScript 6.0.3, and ESLint 9.39.5 remain compatible. TypeScript is pinned below 6.1 because the current TypeScript ESLint parser does not support newer versions; the React/import/accessibility ESLint plugins currently require ESLint 9 or earlier. No peer-dependency overrides are used. `package-lock.json` records the foundation dependencies; it must be refreshed with `npm install` for the new auth packages once registry access is available (see `AUTHENTICATION.md`).

shadcn was initialized with its official CLI using the Radix Nova preset:

```bash
npx --yes shadcn@latest init --base radix --preset nova --yes
npx --yes shadcn@latest add button card input label select table badge dialog tabs dropdown-menu skeleton alert sheet separator sonner --yes
```

Components live in `src/components/ui`; configure future additions through `components.json`, now set to Base Nova to match the imported Base UI components. The commands above record the original scaffold. The `shadcn` package is a development dependency because its CSS is compiled during builds. System fonts keep builds independent of external font services.

## Source organization

```text
src/
├── app/
│   ├── layout.tsx                Metadata, root provider composition
│   ├── page.tsx                  Public introduction
│   ├── globals.css               Semantic green light/dark tokens
│   └── (workspace)/              Shared shell, loading and error boundaries
│       ├── dashboard/page.tsx
│       ├── produce/page.tsx
│       ├── markets/page.tsx
│       ├── recommendations/page.tsx
│       ├── monitoring/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── ui/                       CLI-generated shadcn components
│   ├── layout/                   Sidebar, mobile drawer, header, theme menu
│   ├── providers/                Theme, Query client, Sonner
│   ├── states/                   Reusable loading, empty, and error states
│   └── workspace/                Shared feature-placeholder presentation
├── features/
│   ├── dashboard/                Components, hook, types, local preview service
│   ├── landing/                  Public introduction and illustration
│   └── [feature]/components/     Feature-specific placeholder presentation
├── config/                       App identity, navigation, public environment
├── hooks/                        Reserved for shared hooks
├── lib/                          Axios client, errors, Query client, UI utility
├── services/                     Reserved for cross-feature services
└── types/                        Reserved for cross-feature types

tests/api-error.test.mjs           Safe-error and retry classification tests
```

Routes remain thin Server Component entry points with page-specific metadata. Shared providers and interactive UI use explicit client boundaries. The route group does not add a URL prefix.

## Theme and accessibility

`next-themes` sets the root `class`, defaults to the operating system preference, and persists the user's choice. A CSS-driven icon prevents theme-dependent hydration mismatches. `suppressHydrationWarning` applies only to the root element modified by the theme library.

Semantic CSS variables cover surfaces, text, inputs, borders, focus rings, charts, and sidebar colors. The imported palette, typography, spacing, scrollbar styling, and transition effects are retained in `globals.css`; semantic aliases connect the imported landing styles to these tokens. Navigation has active-page semantics; drawers and menus use Radix keyboard/focus handling. The chart provides a screen-reader table and labels its values as synthetic. Reduced-motion preferences are respected.

## Query and service boundaries

`src/lib/query-client.ts` creates a fresh Query client during server rendering and retains a stable client in the browser, including across initial suspension. Defaults are a 60-second stale time, no refetch on window focus, at most one query retry for eligible failures, and no automatic mutation retries.

The dashboard's service lives under its feature and returns local fixtures. Its hook owns the query key. Future services should live under `features/<feature>/services`, call the Axios client with a relative endpoint and an `AbortSignal`, and validate responses with Zod. Do not silently substitute preview data when a real API fails. Add server prefetching and hydration only when a real data flow requires it.

## Axios and environment configuration

- `.env.example` is the committed template; `.env.local` is ignored.
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` is a placeholder backend origin. Authenticated workspace access now requires the configured backend.
- `src/lib/api.ts` validates the public HTTP(S) base URL when a request is made, applies a 15-second timeout, and accepts JSON responses.
- Missing or invalid configuration fails explicitly instead of accidentally using the frontend origin.
- `src/lib/api-error.ts` normalizes errors into configuration, network, timeout, HTTP, or unknown failures, preserving status and safe retry classification. Raw response bodies, headers, and request details are not exposed to users. Axios cancellation errors pass through unchanged.
- `NEXT_PUBLIC_` values are browser-visible and inlined at build time. Never place API secrets in them. Keep privileged requests and secrets on the server. Authentication uses server-only Supabase SSR clients with HttpOnly cookies; authenticated backend forwarding is in `src/lib/auth/profile.ts`.

## Verification and known limitations

The original foundation passed lint, TypeScript, build, and API error checks. Current authentication validation outcomes and installation blockers are recorded in [AUTHENTICATION.md](AUTHENTICATION.md). Browser checks cover desktop and mobile navigation, theme switching, and client-side rendering with local data. All six workspace routes build successfully.

The production dependency audit reports zero vulnerabilities. The previous foundation audit reported development-tool findings inherited through ESLint and the shadcn CLI (`minimatch` and `deepmerge`); run `npm audit` to inspect the current tree after dependency changes. Suggested force fixes downgrade major tooling versions and were not applied. Recheck these when updating the toolchain.

## Recommended next steps

1. Agree on backend response schemas, market identifiers, units, currencies, and timestamp semantics.
2. Define Sinhala/Tamil/English localization and low-bandwidth/accessibility requirements.
3. Implement one produce or market workflow with Zod schemas, React Hook Form, feature services, and Query hooks.
4. Keep future per-user query data scoped to the verified identity. Authentication and authorization are implemented in Feature 01.
5. Replace the synthetic chart with source-attributed observations, confidence/freshness indicators, and honest empty/error states.
6. Add end-to-end coverage for the first real workflow, then expand recommendations and monitoring.

## Official references

- [Next.js App Router](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [shadcn CLI](https://ui.shadcn.com/docs/cli)
- [TanStack Query App Router guidance](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [next-themes](https://github.com/pacocoursey/next-themes)
- [Axios error handling](https://axios-http.com/docs/handling_errors)

## Imported UI integration

The landing sections remain under `src/components/landing`, with English preview copy in `copy.ts`. The new `ThemeProvider.tsx`, animated `ThemeToggle.tsx`, `app-sidebar.tsx`, `ui/sidebar.tsx`, `reui/timeline.tsx`, and additional UI files are retained. `components/layout/workspace-shell.tsx` wires the imported sidebar into `(workspace)/layout.tsx`; the existing AppShell export delegates to it for compatibility.

The borrowed project's cart, roles, session endpoints, and translation modules are not present in GoviNena. `context/AuthContext.tsx` now receives a verified provider-linked profile from the server workspace layout; `/auth` redirects to `/login`. Language menus retain their styling and show English plus disabled Sinhala/Tamil options marked as coming soon. Full translations remain future work.

The root provider composition includes the imported theme provider, Query client, verified workspace auth context, and one Sonner host. The cached footer is compatible with Next.js Cache Components. View transitions retain the circular reveal, respect reduced motion, handle keyboard activation, and tolerate interrupted animations.
