import { Suspense } from "react";
import { LoadingState } from "@/components/states/loading-state";
import { AuthPage } from "@/features/auth/components/auth-page";
export default function Page({ searchParams }: {
    searchParams: Promise<{
        error?: string;
    }>;
}) {
    return <Suspense fallback={<LoadingState label="Loading your account…" className="min-h-screen" />}><AuthPage mode="login" searchParams={searchParams}/></Suspense>;
}
