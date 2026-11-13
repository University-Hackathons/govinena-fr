"use server";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/auth/server";
import { backendRequest } from "@/lib/auth/profile";
import { validateAuth, providerMessage, type AuthMode, type AuthState } from "./validation";
export async function submitAuth(mode: AuthMode, _previous: AuthState, form: FormData): Promise<AuthState> {
    if (!["login", "register", "forgot-password", "reset-password"].includes(mode))
        return { error: "Invalid request." };
    const values = Object.fromEntries(form);
    if (typeof values.email === "string")
        values.email = values.email.trim();
    const result = validateAuth(mode, values);
    if (!result.success)
        return { fields: result.error.flatten().fieldErrors, error: "Please check the highlighted fields." };
    let destination: string | null = null;
    try {
        const auth = await createAuthClient(true);
        const email = String(values.email ?? "");
        const password = String(values.password ?? "");
        if (mode === "login") {
            const { error } = await auth.auth.signInWithPassword({ email, password });
            if (error)
                return { error: providerMessage(error.code) };
            destination = "/dashboard";
        }
        else if (mode === "register") {
            const { data, error } = await auth.auth.signUp({ email, password });
            if (error)
                return { error: providerMessage(error.code) };
            if (data.session)
                destination = "/dashboard";
            else
                return { success: "Check your inbox for a confirmation link. If this email is already registered, sign in or reset your password." };
        }
        else if (mode === "forgot-password") {
            const { error } = await auth.auth.resetPasswordForEmail(email);
            if (error)
                return { error: providerMessage(error.code) };
            return { success: "If an account exists for this email, you will receive a password reset link." };
        }
        else {
            const { data: { user }, error: userError } = await auth.auth.getUser();
            if (userError || !user)
                return { error: "This reset link has expired. Request a new password reset email." };
            const { error } = await auth.auth.updateUser({ password });
            if (error)
                return { error: providerMessage(error.code) };
            return { success: "Your password has been updated. You can now continue to your workspace." };
        }
    }
    catch {
        return { error: "Authentication is temporarily unavailable. Please try again shortly." };
    }
    if (destination)
        redirect(destination);
    return {};
}
export async function logout(): Promise<AuthState> {
    let signedOut = false;
    try {
        // Revoke API access before deleting cookies. Do not report success on failure.
        const response = await backendRequest("/auth/logout", "POST");
        if (response && !response.ok && response.status !== 401)
            return { error: "Could not sign out securely. Please try again." };
        const auth = await createAuthClient(true);
        const { error } = await auth.auth.signOut({ scope: "local" });
        if (error)
            return { error: "Could not finish signing out. Please try again." };
        signedOut = true;
    }
    catch {
        return { error: "Sign out is temporarily unavailable. Please try again." };
    }
    if (signedOut)
        redirect("/login");
    return {};
}
