"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, type RefObject, useRef } from "react";
import { GateonLogo } from "@/components/gateon-logo";
import { BellIcon, type BellIconHandle } from "@/components/icons/bell";
import {
  FileTextIcon,
  type FileTextIconHandle,
} from "@/components/icons/file-text";
import {
  MonitorIcon,
  type MonitorIconHandle,
} from "@/components/icons/monitor";
import { PlugIcon, type PlugIconHandle } from "@/components/icons/plug";
import {
  SettingsIcon,
  type SettingsIconHandle,
} from "@/components/icons/settings";
import { UserIcon, type UserIconHandle } from "@/components/icons/user";
import { UsersIcon, type UsersIconHandle } from "@/components/icons/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
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
import { cn, getUserInitials } from "@/lib/utils";
import type { PublicUserDto } from "@/lib/zod/auth-schemas";

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

type AnimatedIconKey =
  | "dashboard"
  | "groups"
  | "alerts"
  | "settings"
  | "terms"
  | "members"
  | "plug";

type NavItem =
  | {
      href: string;
      label: string;
      kind: "animated";
      iconKey: AnimatedIconKey;
    }
  | {
      href: string;
      label: string;
      kind: "lucide";
      Icon: LucideIcon;
    };

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Navegação",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        kind: "animated",
        iconKey: "dashboard",
      },
      {
        href: "/groups",
        label: "Grupos",
        kind: "animated",
        iconKey: "groups",
      },
      {
        href: "/members",
        label: "Membros",
        kind: "animated",
        iconKey: "members",
      },
      {
        href: "/alerts",
        label: "Alertas",
        kind: "animated",
        iconKey: "alerts",
      },
      {
        href: "/integrations",
        label: "Integrações",
        kind: "animated",
        iconKey: "plug",
      },
    ],
  },
  {
    label: "Conta",
    items: [
      {
        href: "/settings",
        label: "Configurações",
        kind: "animated",
        iconKey: "settings",
      },
    ],
  },
  {
    label: "Legal",
    items: [
      {
        href: "/terms",
        label: "Termos",
        kind: "animated",
        iconKey: "terms",
      },
    ],
  },
];

function getNavIconClassName(isActive: boolean) {
  return cn(
    "shrink-0 transition-colors duration-200 ease-in-out",
    isActive
      ? "text-sidebar-accent-foreground"
      : "text-muted-foreground group-hover:text-foreground",
  );
}

function SidebarAnimatedIcon({
  iconKey,
  iconRef,
  className,
}: {
  iconKey: AnimatedIconKey;
  iconRef: RefObject<AnimatedIconHandle | null>;
  className?: string;
}) {
  switch (iconKey) {
    case "dashboard":
      return (
        <MonitorIcon
          ref={iconRef as RefObject<MonitorIconHandle | null>}
          size={16}
          isAnimateOnView={false}
          className={className}
        />
      );
    case "groups":
      return (
        <UsersIcon
          ref={iconRef as RefObject<UsersIconHandle | null>}
          size={16}
          isAnimateOnView={false}
          className={className}
        />
      );
    case "alerts":
      return (
        <BellIcon
          ref={iconRef as RefObject<BellIconHandle | null>}
          size={16}
          isAnimateOnView={false}
          animateOnHover={false}
          className={className}
        />
      );
    case "settings":
      return (
        <SettingsIcon
          ref={iconRef as RefObject<SettingsIconHandle | null>}
          size={16}
          isAnimateOnView={false}
          className={className}
        />
      );
    case "terms":
      return (
        <FileTextIcon
          ref={iconRef as RefObject<FileTextIconHandle | null>}
          size={16}
          isAnimateOnView={false}
          animateOnHover={false}
          className={className}
        />
      );
    case "members":
      return (
        <UserIcon
          ref={iconRef as RefObject<UserIconHandle | null>}
          size={16}
          isAnimateOnView={false}
          animateOnHover={false}
          className={className}
        />
      );
    case "plug":
      return (
        <PlugIcon
          ref={iconRef as RefObject<PlugIconHandle | null>}
          size={16}
          isAnimateOnView={false}
          className={className}
        />
      );
  }
}

type SidebarNavLinkProps = {
  href: string;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
};

function SidebarNavLink({
  href,
  label,
  isActive,
  isCollapsed,
  onMouseEnter,
  onMouseLeave,
  children,
}: SidebarNavLinkProps) {
  const linkClassName = cn(
    sidebarMenuButtonVariants({ isActive }),
    "group",
    isActive && "font-semibold",
  );

  if (!isCollapsed) {
    return (
      <Link
        href={href}
        className={linkClassName}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
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
            aria-current={isActive ? "page" : undefined}
            className={cn(linkClassName, triggerProps.className)}
            onMouseEnter={(event) => {
              triggerProps.onMouseEnter?.(event);
              onMouseEnter?.();
            }}
            onMouseLeave={(event) => {
              triggerProps.onMouseLeave?.(event);
              onMouseLeave?.();
            }}
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

type SidebarNavItemProps = {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
};

function SidebarNavItem({ item, isActive, isCollapsed }: SidebarNavItemProps) {
  const iconRef = useRef<AnimatedIconHandle>(null);
  const iconClassName = getNavIconClassName(isActive);

  return (
    <SidebarMenuItem>
      <SidebarNavLink
        href={item.href}
        label={item.label}
        isActive={isActive}
        isCollapsed={isCollapsed}
        onMouseEnter={() => iconRef.current?.startAnimation()}
        onMouseLeave={() => iconRef.current?.stopAnimation()}
      >
        {item.kind === "animated" ? (
          <SidebarAnimatedIcon
            iconKey={item.iconKey}
            iconRef={iconRef}
            className={iconClassName}
          />
        ) : (
          <item.Icon aria-hidden className={iconClassName} />
        )}
        <span className={cn("truncate", isCollapsed && "sr-only")}>
          {item.label}
        </span>
      </SidebarNavLink>
    </SidebarMenuItem>
  );
}

function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarUserFooterProps = {
  user: PublicUserDto;
  isCollapsed: boolean;
};

function SidebarUserFooter({ user, isCollapsed }: SidebarUserFooterProps) {
  const label = user.name ?? user.email;
  const sublabel = user.name ? user.email : null;

  const linkClassName = cn(
    "block rounded-lg outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    isCollapsed ? "px-1 py-2" : "px-2 py-2",
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={(triggerProps) => (
            <div
              {...triggerProps}
              className={cn(
                linkClassName,
                "flex justify-center",
                triggerProps.className,
              )}
            >
              <Avatar className="size-8 shrink-0 shadow-sm ring-1 ring-border">
                {user.image ? (
                  <AvatarImage src={user.image} alt={label} />
                ) : null}
                <AvatarFallback className="text-xs">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        />
        <TooltipContent
          side="right"
          sideOffset={8}
          className="max-w-xs flex flex-col gap-0.5"
        >
          <p className="font-medium">{label}</p>
          {sublabel ? <p className="text-xs">{sublabel}</p> : null}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 p-2",
        isCollapsed ? "justify-center" : "w-full",
      )}
    >
      <Avatar className="size-8 shrink-0 shadow-sm ring-1 ring-border">
        {user.image ? <AvatarImage src={user.image} alt={label} /> : null}
        <AvatarFallback className="text-xs">
          {getUserInitials(user)}
        </AvatarFallback>
      </Avatar>
      {!isCollapsed ? (
        <div className="min-w-0 flex-1 text-left leading-tight">
          <p className="truncate font-medium text-foreground text-sm">
            {label}
          </p>
          {sublabel ? (
            <p className="truncate text-muted-foreground text-xs">{sublabel}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type AppSidebarProps = {
  user: PublicUserDto;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const { open, isMobile } = useSidebar();
  const isCollapsed = !isMobile && !open;

  return (
    <Sidebar className="rounded-l-xl border-border bg-card">
      <SidebarHeader className="border-b border-border">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={(triggerProps) => (
                <Link
                  href="/dashboard"
                  {...triggerProps}
                  aria-label="Gateon"
                  className={cn(
                    "flex h-full min-h-0 w-full min-w-0 items-center justify-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
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
            href="/dashboard"
            className="flex h-full min-h-0 w-full min-w-0 items-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <GateonLogo showWordmark />
          </Link>
        )}
      </SidebarHeader>

      <SidebarContent className="space-y-4 px-3 py-4 group-data-[state=collapsed]/sidebar-wrapper:space-y-0">
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            {!isCollapsed ? (
              <p className="mb-1 px-3 text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {section.label}
              </p>
            ) : null}
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  isActive={isNavItemActive(pathname, item.href)}
                  isCollapsed={isCollapsed}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-border p-2">
        <SidebarUserFooter user={user} isCollapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
