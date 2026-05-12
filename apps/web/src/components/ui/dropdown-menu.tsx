"use client";

import { Menu } from "@base-ui/react/menu";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type DropdownMenuContentProps = Menu.Popup.Props &
  Pick<
    Menu.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding"
  >;

function DropdownMenu({ ...props }: Menu.Root.Props) {
  return <Menu.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: Menu.Trigger.Props) {
  return <Menu.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuPortal(props: Menu.Portal.Props) {
  return <Menu.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuPositioner({
  side = "bottom",
  align = "end",
  sideOffset = 4,
  className,
  ...props
}: Menu.Positioner.Props) {
  return (
    <Menu.Positioner
      data-slot="dropdown-menu-positioner"
      className={cn("z-50 outline-none", className)}
      side={side}
      align={align}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  side = "bottom",
  align = "end",
  sideOffset = 4,
  alignOffset,
  collisionPadding,
  ...popupProps
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuPositioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
      >
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 min-w-56 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none select-none",
            "data-open:animate-in data-starting-style:fade-in-0 data-starting-style:zoom-in-95",
            "data-closed:animate-out data-ending-style:fade-out-0 data-ending-style:zoom-out-95",
            className,
          )}
          {...popupProps}
        />
      </DropdownMenuPositioner>
    </DropdownMenuPortal>
  );
}

function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLinkItem({
  className,
  closeOnClick = true,
  ...props
}: Menu.LinkItem.Props) {
  return (
    <Menu.LinkItem
      data-slot="dropdown-menu-link-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none no-underline",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      closeOnClick={closeOnClick}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: Menu.Separator.Props) {
  return (
    <Menu.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn(
        "px-2 py-1.5 font-medium text-muted-foreground text-xs",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
