import { z } from "zod";
export const authModes = ["login", "register", "forgot-password", "reset-password"] as const;
export type AuthMode = typeof authModes[number];
const email = z.email("Enter a valid email address.").max(320);
const password = z.string().min(8, "Use at least 8 characters.").max(128, "Use no more than 128 characters.");
export function validateAuth(mode: AuthMode, values: Record<string, unknown>) {
    if (mode === "forgot-password")
        return z.object({ email }).safeParse(values);
    if (mode === "login")
        return z.object({ email, password: z.string().min(1, "Enter your password.").max(128) }).safeParse(values);
    const schema = z.object({
        ...(mode === "register" ? { email } : {}),
        password,
        confirmPassword: z.string(),
    }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
    return schema.safeParse(values);
}
export type AuthState = {
    error?: string;
    success?: string;
    fields?: Record<string, string[]>;
};
export function providerMessage(code?: string) {
    switch (code) {
        case "invalid_credentials": return "Email or password is incorrect.";
        case "email_not_confirmed": return "Confirm your email using the link in your inbox before signing in.";
        case "user_already_exists":
        case "email_exists": return "This email is already registered. Sign in or reset your password.";
        case "over_request_rate_limit":
        case "over_email_send_rate_limit": return "Too many attempts. Please wait a few minutes and try again.";
        case "weak_password": return "Choose a stronger password that meets the account password policy.";
        case "same_password": return "Choose a password different from your current password.";
        default: return "We could not complete this request. Please try again shortly.";
    }
}
