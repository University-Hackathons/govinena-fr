import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuthClient } from "./server";
const profileSchema = z.object({ id: z.uuid(), email: z.email(), created_at: z.string() });
export type Profile = z.infer<typeof profileSchema>;
export type BackendPath = "/users/me" | "/auth/logout" | "/farmer/profile" | `/crops${string}` | `/markets${string}`;
export async function backendRequest(path: BackendPath, method = "GET", body?: string) {
    const auth = await createAuthClient();
    const { data: { user }, error } = await auth.auth.getUser();
    if (error && (!error.status || error.status === 429 || error.status >= 500))
        throw new Error("Authentication service is temporarily unavailable.");
    if (error || !user)
        return null;
    // getSession is used only to forward a token after getUser has verified identity.
    const { data: { session } } = await auth.auth.getSession();
    if (!session)
        return null;
    const origin = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!origin)
        throw new Error("API_BASE_URL is not configured.");
    return fetch(`${origin.replace(/\/$/, "")}/api/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
    });
}
export const getProfile = cache(async (): Promise<Profile | null> => {
    const response = await backendRequest("/users/me");
    if (!response || response.status === 401 || response.status === 403)
        return null;
    if (!response.ok)
        throw new Error("Your account is temporarily unavailable. Please try again.");
    return profileSchema.parse(await response.json());
});
export async function requireProfile() {
    const profile = await getProfile();
    if (!profile)
        redirect("/login");
    return profile;
}
