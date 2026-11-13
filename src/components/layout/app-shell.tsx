"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Leaf, Menu } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { navigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Application navigation" className="space-y-1.5">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              active
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const currentPage =
    navigation.find((item) => pathname === item.href)?.label ?? "Workspace";

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#workspace-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-md bg-background p-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      <aside
        aria-label="Desktop sidebar"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar p-5 text-sidebar-foreground lg:flex"
      >
        <Brand />
        <p className="mb-3 mt-10 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your workspace
        </p>
        <Navigation />
        <div className="mt-auto rounded-xl border bg-background/60 p-4">
          <Leaf className="mb-3 size-5 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold">Growing with GoviNena</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            A foundation for informed farming in Sri Lanka.
          </p>
          <Badge variant="outline" className="mt-3">
            Preview workspace
          </Badge>
        </div>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="size-4" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-5">
                <SheetHeader className="p-0 pb-6 text-left">
                  <SheetTitle>AgriMarket</SheetTitle>
                  <SheetDescription>
                    GoviNena preview workspace
                  </SheetDescription>
                </SheetHeader>
                <Navigation onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                GoviNena / Workspace
              </p>
              <p className="truncate text-sm font-semibold">{currentPage}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="mr-2 hidden sm:inline-flex">
              Preview data
            </Badge>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Notifications"
                >
                  <Bell className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  No notifications yet. Live alerts will be available in a
                  future release.
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          id="workspace-content"
          className="mx-auto max-w-7xl space-y-8 p-4 py-7 sm:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
