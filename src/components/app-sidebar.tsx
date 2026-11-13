"use client";

import * as React from "react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, ChevronsUpDown, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { navigation } from "@/config/navigation";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function AppLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="hover:bg-transparent pointer-events-none data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              GN
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-bold text-lg text-sidebar-foreground">
              GoviNena
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

interface NavMenuItem {
  title: string;
  url: string;
  icon?: React.ElementType;
  isActive: boolean;
}

interface NavMenuGroup {
  id: string;
  label: string;
  items: NavMenuItem[];
}

/**
 * One SidebarGroup per functional section. The headings collapse away on their
 * own in icon mode (SidebarGroupLabel fades and pulls itself up), so grouping
 * costs nothing when the sidebar is narrowed.
 */
function NavMain({ groups }: { groups: NavMenuGroup[] }) {
  const { setOpenMobile } = useSidebar();
  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  isActive={item.isActive}
                  aria-current={item.isActive ? "page" : undefined}
                  onClick={() => setOpenMobile(false)}
                  tooltip={item.title}
                  render={
                    <Link href={item.url} className="flex items-center gap-2" />
                  }
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}

function NavUser({
  user,
  profileHref,
  notificationsHref,
}: {
  profileHref: string;
  notificationsHref: string;
  user: {
    name: string;
    email: string;
  };
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar>
              <AvatarFallback>
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarFallback>
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  setOpenMobile(false);
                  router.push(profileHref);
                }}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setOpenMobile(false);
                  router.push(notificationsHref);
                }}
              >
                <Bell className="mr-2 h-4 w-4" />
                Monitoring
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <LogoutButton />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const pathname = usePathname();
  const navGroups: NavMenuGroup[] = [
    {
      id: "workspace",
      label: "Workspace",
      items: navigation.map((item) => ({
        title: item.label,
        url: item.href,
        icon: item.icon,
        isActive:
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      })),
    },
  ];
  const navUser = user
    ? { name: user.name, email: user.email }
    : { name: "Preview workspace", email: "No account connected" };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={navUser}
          profileHref="/profile"
          notificationsHref="/monitoring"
        />
      </SidebarFooter>
    </Sidebar>
  );
}
