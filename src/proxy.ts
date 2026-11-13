import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, authCookieOptions } from "@/lib/auth/config";
export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });
    let settings;
    try {
        settings = authConfig();
    }
    catch {
        return new NextResponse("Authentication is not configured. Please contact the administrator.", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const { url, key } = settings;
    const auth = createServerClient(url, key, {
        cookieOptions: authCookieOptions,
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll(values) {
                values.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                values.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, ...authCookieOptions }));
            },
        },
    });
    // Always verify; never authorize from getSession or cookie presence.
    const { data: { user }, error } = await auth.auth.getUser();
    const protectedPage = ["/dashboard", "/produce", "/markets", "/recommendations", "/monitoring", "/settings", "/profile", "/onboarding"]
        .some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
    if (protectedPage) {
        let status = 401;
        if (user && !error) {
            const { data: { session } } = await auth.auth.getSession();
            const origin = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
            if (!origin)
                status = 503;
            else if (session) {
                try {
                    const result = await fetch(`${origin.replace(/\/$/, "")}/api/v1/users/me`, {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        cache: "no-store", signal: AbortSignal.timeout(15000),
                    });
                    status = result.status;
                    // First-time users finish the core profile before entering workspace pages.
                    // Profile/onboarding themselves stay reachable to avoid redirect loops.
                    if (status === 200 && !["/profile", "/onboarding"].some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))) {
                        const farmer = await fetch(`${origin.replace(/\/$/, "")}/api/v1/farmer/profile`, {
                            headers: { Authorization: `Bearer ${session.access_token}` },
                            cache: "no-store", signal: AbortSignal.timeout(15000),
                        });
                        if (farmer.status === 404) {
                            const onboarding = NextResponse.redirect(new URL("/onboarding", request.url));
                            response.cookies.getAll().forEach((cookie) => onboarding.cookies.set(cookie));
                            onboarding.headers.set("Cache-Control", "private, no-store");
                            return onboarding;
                        }
                        if (!farmer.ok) status = farmer.status;
                    }
                }
                catch {
                    status = 503;
                }
            }
        }
        else if (error && (!error.status || error.status >= 500))
            status = 503;
        if (status === 401 || status === 403) {
            const redirected = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
            redirected.headers.set("Cache-Control", "private, no-store");
            return redirected;
        }
        if (status !== 200) {
            const unavailable = new NextResponse("Your account is temporarily unavailable. Please reload to try again.", { status: 503, headers: { "Cache-Control": "no-store" } });
            response.cookies.getAll().forEach((cookie) => unavailable.cookies.set(cookie));
            return unavailable;
        }
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
}
export const config = {
    matcher: ["/dashboard/:path*", "/produce/:path*", "/markets/:path*", "/recommendations/:path*", "/monitoring/:path*", "/settings/:path*", "/profile/:path*", "/onboarding/:path*", "/login", "/register", "/forgot-password", "/reset-password", "/auth/:path*", "/api/users/me", "/api/farmer/profile", "/api/catalog/:path*", "/api/produce/:path*"],
};
