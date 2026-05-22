"use client";

import {
  HomeIcon,
  LayoutDashboardIcon,
  UserRoundCheckIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GateonLogo } from "@/components/gateon-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Visão geral", Icon: LayoutDashboardIcon },
  { href: "/", label: "Site", Icon: HomeIcon },
  { href: "/groups", label: "Grupos", Icon: UsersIcon },
  { href: "/members", label: "Membros", Icon: UserRoundCheckIcon },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="rounded-l-xl border-r border-border">
      <SidebarHeader>
        <Link
          href="/"
          className="flex h-full min-h-0 w-full min-w-0 items-center outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <GateonLogo />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map(({ href, label, Icon }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <SidebarMenuItem key={href}>
                <Link
                  href={href}
                  className={cn(sidebarMenuButtonVariants({ isActive }))}
                >
                  <Icon />
                  {label}
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <p className="text-xs text-sidebar-foreground/70">
          Automação de acesso por assinatura
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
