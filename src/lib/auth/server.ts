import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { io } from "next/cache";
import { authConfig, authCookieOptions } from "./config";
// All provider calls stay on the server. No browser client or localStorage.
export async function createAuthClient(writable = false) {
    // Supabase initialization checks session expiry with Date.now(). Keep it
    // outside prerendering, without blocking prefetch/instant UI validation.
    await io();
    const store = await cookies();
    const { url, key } = authConfig();
    return createServerClient(url, key, {
        cookieOptions: authCookieOptions,
        cookies: {
            getAll: () => store.getAll(),
            setAll(values) {
                // Proxy refreshes cookies before Server Components render.
                if (writable)
                    values.forEach(({ name, value, options }) => store.set(name, value, { ...options, ...authCookieOptions }));
            },
        },
    });
}
