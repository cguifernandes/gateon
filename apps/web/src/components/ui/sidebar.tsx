"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import type { ComponentProps } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";

type SidebarContextValue = {
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

function SidebarProvider({
  className,
  style,
  children,
  ...props
}: ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((open) => !open);
    }
  }, [isMobile]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (isMobile) {
          setOpenMobile((open) => !open);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile]);

  const value = React.useMemo(
    () => ({
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [openMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-provider"
        className={cn(
          "group/sidebar-wrapper flex h-full min-h-0 w-full flex-col",
          className,
        )}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
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
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side={side}
          sheetTitle="Navegação"
          showClose
          className={cn(
            "w-[min(100%,var(--sidebar-width-mobile))] max-w-[min(100%,var(--sidebar-width-mobile))] border-border bg-white p-0 text-sidebar-foreground",
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
      className={cn(
        "hidden h-full min-h-0 w-(--sidebar-width) shrink-0 flex-col overflow-hidden bg-white text-sidebar-foreground md:flex",
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
      className={cn("mt-auto border-t border-border p-4", className)}
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
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring [&_svg]:size-4 [&_svg]:shrink-0",
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
  const { toggleSidebar, isMobile } = useSidebar();
  if (!isMobile) {
    return null;
  }
  return (
    <Button
      type="button"
      data-slot="sidebar-trigger"
      variant="outline"
      size="icon-sm"
      className={cn("shrink-0", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeftIcon className="size-4" />
      <span className="sr-only">Abrir menu</span>
    </Button>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
