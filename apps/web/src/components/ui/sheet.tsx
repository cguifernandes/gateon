"use client";

import { Dialog } from "@base-ui/react/dialog";
import type * as React from "react";
import { useRef } from "react";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
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

function SheetCloseButton({ className }: { className?: string }) {
  const xIconRef = useRef<XIconHandle>(null);

  return (
    <Dialog.Close
      render={(closeProps) => (
        <Button
          {...closeProps}
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "absolute inset-e-6 top-4 z-10 shrink-0",
            className,
            closeProps.className,
          )}
          aria-label="Fechar"
          onMouseEnter={(event) => {
            closeProps.onMouseEnter?.(event);
            xIconRef.current?.startAnimation();
          }}
          onMouseLeave={(event) => {
            closeProps.onMouseLeave?.(event);
            xIconRef.current?.stopAnimation();
          }}
        >
          <XIcon size={16} isAnimateOnView={false} ref={xIconRef} />
          <span className="sr-only">Fechar</span>
        </Button>
      )}
    />
  );
}

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
          "fixed z-50 flex flex-col gap-4 bg-background p-6 shadow-lg outline-none",
          "data-open:animate-in data-closed:animate-out data-closed:fade-out-0",
          side === "top" &&
            "data-open:slide-in-from-top data-closed:slide-out-to-top inset-x-0 top-0 max-h-[85vh] w-full rounded-b-2xl border-b",
          side === "bottom" &&
            "data-open:slide-in-from-bottom data-closed:slide-out-to-bottom inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-2xl border-t",
          side === "left" &&
            "data-open:slide-in-from-left data-closed:slide-out-to-left inset-y-0 left-0 h-full w-[min(100%,var(--sidebar-width-mobile,18rem))] max-w-[min(100%,var(--sidebar-width-mobile,18rem))] border-r",
          side === "right" &&
            "data-open:slide-in-from-right data-closed:slide-out-to-right inset-y-0 right-0 h-full w-[min(100%,24rem)] border-l sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <Dialog.Title className="sr-only">{sheetTitle}</Dialog.Title>
        {showClose ? <SheetCloseButton /> : null}
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
