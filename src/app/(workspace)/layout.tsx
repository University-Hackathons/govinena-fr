import { Suspense, type ReactNode } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { LoadingState } from "@/components/states/loading-state";
import { AuthProvider } from "@/context/AuthContext";
import { requireProfile } from "@/lib/auth/profile";

// Entering the workspace must wait for verified identity. Allow this ancestor
// to block while Next.js continues validating navigation between its pages.
export const instant = false;

async function VerifiedWorkspace({ children }: { children: ReactNode }) {
  const user = await requireProfile();
  return (
    <AuthProvider user={user}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </AuthProvider>
  );
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState label="Loading your account…" className="min-h-screen" />}>
      <VerifiedWorkspace>{children}</VerifiedWorkspace>
    </Suspense>
  );
}
