"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, type RefObject, useRef } from "react";
import { GateonLogo } from "@/components/gateon-logo";
import {
  ArrowLeftIcon,
  type ArrowLeftIconHandle,
} from "@/components/icons/arrow-left";
import {
  FileTextIcon,
  type FileTextIconHandle,
} from "@/components/icons/file-text";
import {
  ShieldCheckIcon,
  type ShieldCheckIconHandle,
} from "@/components/icons/shield-check";
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
import { cn } from "@/lib/utils";

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

type LegalNavItem = {
  href: string;
  label: string;
  iconKey: "terms" | "privacy";
};

const legalNavItems: LegalNavItem[] = [
  { href: "/terms", label: "Termos de uso", iconKey: "terms" },
  { href: "/privacy", label: "Política de privacidade", iconKey: "privacy" },
];

function getNavIconClassName(isActive: boolean) {
  return cn(
    "shrink-0 transition-colors duration-200 ease-in-out",
    isActive
      ? "text-sidebar-accent-foreground"
      : "text-muted-foreground group-hover:text-foreground",
  );
}

function LegalSidebarIcon({
  iconKey,
  iconRef,
  className,
}: {
  iconKey: LegalNavItem["iconKey"];
  iconRef: RefObject<AnimatedIconHandle | null>;
  className?: string;
}) {
  if (iconKey === "privacy") {
    return (
      <ShieldCheckIcon
        ref={iconRef as RefObject<ShieldCheckIconHandle | null>}
        size={16}
        isAnimateOnView={false}
        animateOnHover={false}
        className={className}
      />
    );
  }

  return (
    <FileTextIcon
      ref={iconRef as RefObject<FileTextIconHandle | null>}
      size={16}
      isAnimateOnView={false}
      animateOnHover={false}
      className={className}
    />
  );
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
  const linkClassName = cn(sidebarMenuButtonVariants({ isActive }), "group");

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

function isNavItemActive(pathname: string, href: string) {
  return pathname === href;
}

type LegalNavItemLinkProps = {
  item: LegalNavItem;
  isActive: boolean;
  isCollapsed: boolean;
};

function LegalNavItemLink({
  item,
  isActive,
  isCollapsed,
}: LegalNavItemLinkProps) {
  const iconRef = useRef<AnimatedIconHandle>(null);

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
        <LegalSidebarIcon
          iconKey={item.iconKey}
          iconRef={iconRef}
          className={getNavIconClassName(isActive)}
        />
        <span className={cn("truncate", isCollapsed && "sr-only")}>
          {item.label}
        </span>
      </SidebarNavLink>
    </SidebarMenuItem>
  );
}

function LegalSidebarFooter({ isCollapsed }: { isCollapsed: boolean }) {
  const iconRef = useRef<ArrowLeftIconHandle>(null);
  const linkClassName = cn(
    sidebarMenuButtonVariants({ isActive: false }),
    "group w-full",
  );

  const content = (
    <>
      <ArrowLeftIcon
        ref={iconRef}
        size={16}
        isAnimateOnView={false}
        className="shrink-0 text-muted-foreground transition-colors duration-200 ease-in-out group-hover:text-foreground"
      />
      <span className={cn("truncate", isCollapsed && "sr-only")}>
        Voltar ao site
      </span>
    </>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={(triggerProps) => (
            <Link
              href="/"
              {...triggerProps}
              aria-label="Voltar ao site"
              className={cn(linkClassName, triggerProps.className)}
              onMouseEnter={(event) => {
                triggerProps.onMouseEnter?.(event);
                iconRef.current?.startAnimation();
              }}
              onMouseLeave={(event) => {
                triggerProps.onMouseLeave?.(event);
                iconRef.current?.stopAnimation();
              }}
            >
              {content}
            </Link>
          )}
        />
        <TooltipContent side="right" sideOffset={8}>
          Voltar ao site
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href="/"
      className={linkClassName}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      {content}
    </Link>
  );
}

export function LegalAppSidebar() {
  const pathname = usePathname();
  const { open, isMobile } = useSidebar();
  const isCollapsed = !isMobile && !open;

  return (
    <Sidebar className="border-border bg-card">
      <SidebarHeader className="border-b border-border">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={(triggerProps) => (
                <Link
                  href="/"
                  {...triggerProps}
                  aria-label="Gateon"
                  className={cn(
                    "flex h-full min-h-0 w-full min-w-0 items-center justify-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    triggerProps.className,
                  )}
                >
                  <GateonLogo className="gap-0" />
                </Link>
              )}
            />
            <TooltipContent side="right" sideOffset={8}>
              Gateon
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link href="/" className="flex items-center justify-center w-full">
            <GateonLogo />
          </Link>
        )}
      </SidebarHeader>

      <SidebarContent className="space-y-4 px-3 py-4 group-data-[state=collapsed]/sidebar-wrapper:space-y-0">
        <SidebarGroup>
          {!isCollapsed ? (
            <p className="mb-1 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Legal
            </p>
          ) : null}
          <SidebarMenu>
            {legalNavItems.map((item) => (
              <LegalNavItemLink
                key={item.href}
                item={item}
                isActive={isNavItemActive(pathname, item.href)}
                isCollapsed={isCollapsed}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-border p-2">
        <LegalSidebarFooter isCollapsed={isCollapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}
