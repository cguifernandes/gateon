"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { type ComponentProps, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getSidebarOpenSnapshot,
  persistSidebarOpen,
  subscribeSidebarOpen,
  syncSidebarOpenCookieFromStorage,
} from "@/lib/sidebar-storage";
import { cn } from "@/lib/utils";
import {
  PanelLeftCloseIcon,
  type PanelLeftCloseIconHandle,
} from "../icons/panel-left-close";
import {
  PanelLeftOpenIcon,
  type PanelLeftOpenIconHandle,
} from "../icons/panel-left-open";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_ICON = "3.5rem";
const SIDEBAR_WIDTH_MOBILE = "20rem";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return ctx;
}

type SidebarProviderProps = ComponentProps<"div"> & {
  defaultOpen?: boolean;
};

function SidebarProvider({
  className,
  style,
  children,
  defaultOpen = true,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  const open = React.useSyncExternalStore(
    subscribeSidebarOpen,
    getSidebarOpenSnapshot,
    () => defaultOpen,
  );

  const setOpen = React.useCallback((value: React.SetStateAction<boolean>) => {
    const current = getSidebarOpenSnapshot();
    const next = typeof value === "function" ? value(current) : value;
    persistSidebarOpen(next);
  }, []);

  React.useLayoutEffect(() => {
    syncSidebarOpenCookieFromStorage();
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((current) => !current);
      return;
    }
    setOpen((current) => !current);
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [open, openMobile, isMobile, toggleSidebar, setOpen],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-provider"
        data-state={open ? "expanded" : "collapsed"}
        suppressHydrationWarning
        className={cn(
          "group/sidebar-wrapper flex h-full min-h-0 w-full flex-col",
          className,
        )}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

type SidebarProps = ComponentProps<"div"> & {
  side?: "left" | "right";
};

function Sidebar({
  side = "left",
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, open, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side={side}
          sheetTitle="Navegação"
          showClose
          className={cn(
            "w-[min(100%,var(--sidebar-width-mobile))] max-w-[min(100%,var(--sidebar-width-mobile))] border-border bg-background p-0 text-sidebar-foreground",
            className,
          )}
        >
          <div className="flex h-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-slot="sidebar"
      data-side={side}
      data-state={open ? "expanded" : "collapsed"}
      suppressHydrationWarning
      className={cn(
        "hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-background text-sidebar-foreground transition-[width] duration-200 ease-linear md:flex",
        open ? "w-(--sidebar-width)" : "w-(--sidebar-width-icon)",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SidebarInset({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-linear-to-b from-surface-container to-surface-bright",
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        "flex h-20 shrink-0 flex-row items-center px-4 sm:px-6",
        "group-data-[state=collapsed]/sidebar-wrapper:h-16 group-data-[state=collapsed]/sidebar-wrapper:justify-center group-data-[state=collapsed]/sidebar-wrapper:px-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn(
        "mt-auto border-t border-border p-4",
        "group-data-[state=collapsed]/sidebar-wrapper:p-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex flex-1 flex-col gap-1 overflow-y-auto p-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      className={cn("mx-2 bg-sidebar-border", className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn(
        "flex flex-col gap-1",
        "group-data-[state=collapsed]/sidebar-wrapper:not-first:mt-2 group-data-[state=collapsed]/sidebar-wrapper:not-first:border-t group-data-[state=collapsed]/sidebar-wrapper:not-first:border-border group-data-[state=collapsed]/sidebar-wrapper:not-first:pt-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      className={cn("group/menu-item", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_svg]:size-4 [&_svg]:shrink-0 group-data-[state=collapsed]/sidebar-wrapper:justify-center group-data-[state=collapsed]/sidebar-wrapper:gap-0 group-data-[state=collapsed]/sidebar-wrapper:px-2",
  {
    variants: {
      isActive: {
        true: "bg-sidebar-accent text-sidebar-accent-foreground",
        false:
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  },
);

type SidebarMenuButtonProps = ComponentProps<"button"> &
  VariantProps<typeof sidebarMenuButtonVariants>;

function SidebarMenuButton({
  className,
  isActive,
  ...props
}: SidebarMenuButtonProps) {
  return (
    <button
      type="button"
      data-slot="sidebar-menu-button"
      data-active={isActive ? "true" : "false"}
      className={cn(sidebarMenuButtonVariants({ isActive }), className)}
      {...props}
    />
  );
}

function SidebarTrigger({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();
  const isSidebarOpen = isMobile ? openMobile : open;
  const panelLeftCloseIconRef = useRef<PanelLeftCloseIconHandle>(null);
  const panelLeftOpenIconRef = useRef<PanelLeftOpenIconHandle>(null);

  const handleTriggerMouseEnter = () => {
    if (isSidebarOpen) {
      panelLeftCloseIconRef.current?.startAnimation();
      return;
    }
    panelLeftOpenIconRef.current?.startAnimation();
  };

  const handleTriggerMouseLeave = () => {
    if (isSidebarOpen) {
      panelLeftCloseIconRef.current?.stopAnimation();
      return;
    }
    panelLeftOpenIconRef.current?.stopAnimation();
  };

  return (
    <Button
      type="button"
      data-slot="sidebar-trigger"
      variant="outline"
      size="icon-md"
      className={cn("shrink-0", className)}
      onMouseEnter={handleTriggerMouseEnter}
      onMouseLeave={handleTriggerMouseLeave}
      onClick={toggleSidebar}
      aria-expanded={isSidebarOpen}
      aria-label={
        isSidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"
      }
      {...props}
    >
      {isSidebarOpen ? (
        <PanelLeftCloseIcon size={24} ref={panelLeftCloseIconRef} />
      ) : (
        <PanelLeftOpenIcon size={24} ref={panelLeftOpenIconRef} />
      )}
      <span className="sr-only">
        {isSidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
      </span>
    </Button>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  sidebarMenuButtonVariants,
  useSidebar,
};
