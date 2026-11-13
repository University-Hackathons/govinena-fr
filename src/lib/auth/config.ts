export function authConfig() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key)
        throw new Error("Authentication is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
    return { url, key };
}
export const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};
