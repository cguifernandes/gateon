"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type * as React from "react";
import { useRef } from "react";
import { XIcon, type XIconHandle } from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

type DialogContentProps = DialogPrimitive.Popup.Props & {
  showClose?: boolean;
};

function DialogCloseButton({ className }: { className?: string }) {
  const xIconRef = useRef<XIconHandle>(null);

  return (
    <DialogPrimitive.Close
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

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogPrimitive.Backdrop
        className={cn(
          "pointer-events-auto fixed inset-0 z-[100] bg-black/40 data-ending-style:animate-out data-ending-style:fade-out-0",
          "data-starting-style:animate-in data-starting-style:fade-in-0",
        )}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "pointer-events-auto fixed top-1/2 left-1/2 z-[101] flex max-h-[min(90vh,32rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-background shadow-lg outline-none select-none",
          "data-open:animate-in data-starting-style:fade-in-0 data-starting-style:zoom-in-95",
          "data-closed:animate-out data-ending-style:fade-out-0 data-ending-style:zoom-out-95",
          className,
        )}
        {...props}
      >
        {showClose ? <DialogCloseButton /> : null}
        {children}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 px-6 py-4 text-start", className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-semibold font-heading text-lg leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("font-light text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
