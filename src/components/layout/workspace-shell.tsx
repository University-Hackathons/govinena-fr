"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { navigation } from "@/config/navigation";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title =
    navigation.find((item) => item.href === pathname)?.label ?? "Workspace";
  return (
    <SidebarProvider>
      <a
        href="#workspace-content"
        className="sr-only fixed top-4 left-4 z-50 rounded-md bg-background p-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <span className="truncate text-sm font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              Preview data
            </Badge>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                  />
                }
              >
                <Bell aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                </DropdownMenuGroup>
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No notifications yet. Live alerts are not connected.
                </p>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          id="workspace-content"
          className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-8"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
