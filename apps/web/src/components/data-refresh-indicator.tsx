"use client";

import { LoaderIcon } from "@/components/icons/loader";
import { cn } from "@/lib/utils";

type DataRefreshIndicatorProps = {
  visible: boolean;
  label?: string;
  className?: string;
};

export function DataRefreshIndicator({
  visible,
  label = "Atualizando resultados...",
  className,
}: DataRefreshIndicatorProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 -translate-y-1/2 right-1/2 translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-muted-foreground text-xs shadow-sm backdrop-blur-sm",
        className,
      )}
      aria-live="polite"
    >
      <LoaderIcon size={14} className="shrink-0" />
      <span>{label}</span>
    </div>
  );
}
