import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export function AppShell({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
