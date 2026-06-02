"use client";

import {
  BellRingIcon,
  HomeIcon,
  LayoutDashboardIcon,
  UserRoundCheckIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { GateonLogo } from "@/components/gateon-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  sidebarMenuButtonVariants,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Visão geral", Icon: LayoutDashboardIcon },
  { href: "/", label: "Site", Icon: HomeIcon },
  { href: "/groups", label: "Grupos", Icon: UsersIcon },
  { href: "/members", label: "Membros", Icon: UserRoundCheckIcon },
  { href: "/alerts", label: "Alertas", Icon: BellRingIcon },
] as const;

type SidebarNavLinkProps = {
  href: string;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  children: ReactNode;
};

function SidebarNavLink({
  href,
  label,
  isActive,
  isCollapsed,
  children,
}: SidebarNavLinkProps) {
  const linkClassName = cn(sidebarMenuButtonVariants({ isActive }));

  if (!isCollapsed) {
    return (
      <Link href={href} className={linkClassName}>
        {children}
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Link
            href={href}
            {...triggerProps}
            aria-label={label}
            className={cn(linkClassName, triggerProps.className)}
          >
            {children}
          </Link>
        )}
      />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { open, isMobile } = useSidebar();
  const isCollapsed = !isMobile && !open;

  return (
    <Sidebar className="rounded-l-xl border-r border-border">
      <SidebarHeader>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={(triggerProps) => (
                <Link
                  href="/"
                  {...triggerProps}
                  aria-label="Gateon"
                  className={cn(
                    "flex h-full min-h-0 w-full min-w-0 items-center justify-center outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    triggerProps.className,
                  )}
                >
                  <GateonLogo showWordmark={false} className="gap-0" />
                </Link>
              )}
            />
            <TooltipContent side="right" sideOffset={8}>
              Gateon
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/"
            className="flex h-full min-h-0 w-full min-w-0 items-center outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <GateonLogo showWordmark />
          </Link>
        )}
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
                <SidebarNavLink
                  href={href}
                  label={label}
                  isActive={isActive}
                  isCollapsed={isCollapsed}
                >
                  <Icon />
                  <span className={cn("truncate", isCollapsed && "sr-only")}>
                    {label}
                  </span>
                </SidebarNavLink>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <p
          className={cn(
            "text-xs text-sidebar-foreground/70",
            isCollapsed && "sr-only",
          )}
        >
          Automação de acesso por assinatura
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
