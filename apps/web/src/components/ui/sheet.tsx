"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Sheet({ ...props }: Dialog.Root.Props) {
  return <Dialog.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: Dialog.Trigger.Props) {
  return <Dialog.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: Dialog.Close.Props) {
  return <Dialog.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: Dialog.Portal.Props) {
  return <Dialog.Portal {...props} />;
}

type SheetContentProps = Dialog.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  showClose?: boolean;
  /** Accessible title (visually hidden). */
  sheetTitle?: string;
};

function SheetContent({
  side = "right",
  className,
  children,
  showClose = true,
  sheetTitle = "Painel",
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <Dialog.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-black/40 data-ending-style:animate-out data-ending-style:fade-out-0",
          "data-starting-style:animate-in data-starting-style:fade-in-0",
        )}
      />
      <Dialog.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 border border-border bg-background p-6 shadow-lg outline-none",
          "data-open:animate-in data-closed:animate-out data-closed:fade-out-0",
          side === "top" &&
            "data-open:slide-in-from-top data-closed:slide-out-to-top inset-x-0 top-0 max-h-[85vh] w-full rounded-b-2xl border-b",
          side === "bottom" &&
            "data-open:slide-in-from-bottom data-closed:slide-out-to-bottom inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-2xl border-t",
          side === "left" &&
            "data-open:slide-in-from-left data-closed:slide-out-to-left inset-y-0 left-0 h-full w-[min(100%,var(--sidebar-width-mobile,18rem))] border-r sm:max-w-sm",
          side === "right" &&
            "data-open:slide-in-from-right data-closed:slide-out-to-right inset-y-0 right-0 h-full w-[min(100%,24rem)] border-l sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <Dialog.Title className="sr-only">{sheetTitle}</Dialog.Title>
        {showClose ? (
          <Dialog.Close
            data-slot="sheet-close-button"
            className="absolute inset-e-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground opacity-80 transition-opacity hover:bg-muted hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        ) : null}
        {children}
      </Dialog.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 text-start", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-lg font-semibold text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
