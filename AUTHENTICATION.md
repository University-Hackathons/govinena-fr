# Feature 01: authentication and sessions

## Setup

1. In this directory run `npm install`, then `npx playwright install chromium`. This installs the declared Supabase SSR/JS and Playwright packages and updates `package-lock.json`. Installation in the implementation environment failed with `EAI_AGAIN` DNS errors; the lockfile is still the pre-feature version, so use `npm install` before `npm ci`.
2. Set these server-only variables in `.env.local`:

   ```dotenv
   API_BASE_URL=http://localhost:8000
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_PUBLISHABLE_KEY=YOUR_PROJECT_PUBLISHABLE_KEY
   ```

   Use the same project as the backend. Legacy anon keys also work. Never use a service role key. Existing `NEXT_PUBLIC_API_BASE_URL` remains a fallback API origin; authentication credentials are not public variables.
3. In Supabase Authentication URL Configuration, set Site URL to `http://localhost:3000` locally and your HTTPS origin in production. Set the project's allowed redirect URLs to your actual site URLs. Use a separate project for disposable tests.
4. Enable email/password sign-in and email confirmation. Configure an SMTP sender for confirmation and recovery emails. Update Supabase email templates to use these links (preserve template braces):

   | Template | Link |
   | --- | --- |
   | Confirm signup | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` |
   | Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` |

   These hash links are required: the server callback exchanges the single-use token for cookies. Default implicit browser-fragment links are not used. See [Supabase SSR setup](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs) and [password recovery](https://supabase.com/docs/guides/auth/passwords).
5. Start the migrated backend, then `npm run dev`. Use HTTPS in production. Production cookies are Secure; all auth cookies are HttpOnly, SameSite=Lax, path `/`. Do not add a browser Supabase client: provider operations run in Server Actions or Route Handlers and no access/refresh token is sent through client context or localStorage.

## Changed areas

- `src/lib/auth/`: server-only provider client, cookie options, typed profile loader, and authenticated backend forwarding.
- `src/proxy.ts`: refreshes provider sessions and verifies protected-page access on each server request, including backend revocation checks. Auth responses use no-store. Missing configuration and service failures fail closed.
- `src/features/auth/`: shared forms, backend validation in Server Actions, safe provider messages, login/signup/recovery/password change, and logout.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/confirm`: new flows. Existing `/auth` links redirect to `/login`. Authenticated users are redirected away from guest forms. Password reset requires a verified session.
- Workspace layout/context/sidebar: verified profile passed into the existing shell, account menu sign-out, session reads behind Suspense for Cache Components. No changes to the landing page or existing workspace design.
- `GET /api/users/me`: same-origin frontend endpoint; forwards credentials on the server and returns only the current profile, never tokens.
- `src/app/error.tsx`: retry state for unavailable account data.
- `tests/auth-validation.test.mjs`, `e2e/auth.spec.ts`, `playwright.config.ts`: unit and browser coverage. Auth traces/video/screenshots are disabled to avoid recording credentials.

## Manual verification

1. Visit `/` and confirm the landing page is unchanged. In a signed-out browser, visit each workspace route; expect `/login` and no workspace content.
2. Visit `/register`. Try an invalid email, a short password, and mismatched confirmation; check validation and pending states. Register a new email, follow the confirmation email, and check that the workspace and your email appear.
3. Sign out using the sidebar account menu. Try an incorrect password and expect a clear error. Sign in correctly and reload; your session and email should remain.
4. While signed in, visit `/login` and `/register`; both should return to `/dashboard`. Inspect browser storage: auth cookies must be HttpOnly, SameSite=Lax and Secure on production HTTPS. No auth tokens should exist in localStorage.
5. Sign out. Reload the workspace, use the browser back button, and request `/api/users/me`; no fresh protected content should load and the API should return 401. Another signed-in browser/device should remain signed in.
6. Try registering the same email. Depending on Supabase's email-enumeration protection, you receive either a duplicate message or a generic check-inbox message that explains existing users should sign in/reset. This intentionally preserves the provider's privacy behavior.
7. Select Forgot password, request a reset email, follow its link, enter matching new passwords, and submit. Sign out, verify the old password fails and the new password works. Reusing or expiring an email link should display an invalid-link message. No-email-provider environments cannot complete delivery verification.
8. Sign in as a second confirmed account in a private browser. `/api/users/me` must show only that account; verify API ownership and revoked token checks described in the backend guide.
9. Stop the backend or Supabase in a disposable environment. Workspace access must fail closed with a retry/unavailable state; forms and logout must show safe errors without claiming success.
10. Repeat forms and sidebar sign-out at a narrow mobile width and with keyboard navigation.

## Automated checks

```bash
npm run lint
npm test
npm run typecheck
npm run build
npm run test:e2e
```

The anonymous Playwright test requires configured Supabase/backend services. For the main live flow set `E2E_EMAIL` and `E2E_PASSWORD` for a confirmed disposable user. The test checks wrong credentials, login, the current-user endpoint, cookies, refresh, guest-route redirects, and logout. Optional `E2E_SIGNUP_EMAIL` and `E2E_SIGNUP_PASSWORD` enable the registration/duplicate flow, which sends real emails and assumes confirmation is enabled. Use a fresh disposable address and observe provider rate limits. Remove disposable users through your test Supabase dashboard after testing. `E2E_BASE_URL` can target an already-running site. Password reset completion needs access to the configured mailbox and is covered by the manual steps above.

## Outcomes in this workspace

- `npm run lint`: passed after fixing a Link lint violation.
- `npm test`: passed both test files (API error handling and auth validation/messages).
- `npm run typecheck`: blocked by missing `@supabase/ssr` and `@playwright/test`; package-derived types cannot resolve until installation succeeds.
- `npm run build`: failed because `@supabase/ssr` could not be resolved.
- `npm run test:e2e`: failed to start because `playwright` is not installed.
- `npm install`: failed with registry DNS `EAI_AGAIN`. Package declarations were added, but no fake dependency types or replacement auth implementation were introduced.
- No real signup/login/email delivery or browser rendering run was completed here. A successful production build and real-provider E2E run are still required before merging/deploying.
