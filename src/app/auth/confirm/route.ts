import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/auth/server";
export async function GET(request: NextRequest) {
    const token_hash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");
    const destination = type === "recovery" ? "/reset-password" : "/dashboard";
    let valid = false;
    if (token_hash && (type === "email" || type === "recovery")) {
        try {
            const auth = await createAuthClient(true);
            const { error } = await auth.auth.verifyOtp({ token_hash, type });
            valid = !error;
        }
        catch { /* Safe, generic link error; never echo token parameters. */ }
    }
    const response = NextResponse.redirect(new URL(valid ? destination : "/login?error=invalid-link", request.url));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
}
