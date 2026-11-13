import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/auth/server";
import { getProfile } from "@/lib/auth/profile";
import { AuthForm } from "./auth-form";
import type { AuthMode } from "../validation";
export async function AuthPage({ mode, searchParams }: {
    mode: AuthMode;
    searchParams: Promise<{
        error?: string;
    }>;
}) {
    const params = await searchParams;
    if (mode === "reset-password") {
        const auth = await createAuthClient();
        const { data: { user }, error } = await auth.auth.getUser();
        if (error || !user)
            redirect("/forgot-password?error=expired");
    }
    else {
        if (await getProfile())
            redirect("/dashboard");
    }
    return <AuthForm mode={mode} linkError={!!params.error}/>;
}
