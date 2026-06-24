import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableToolbarProps = {
  search: ReactNode;
  controls?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function DataTableToolbar({
  search,
  controls,
  actions,
  className,
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative w-full flex-1 sm:max-w-sm">{search}</div>
        {controls ? (
          <div className="flex shrink-0 items-center gap-2">{controls}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 sm:w-auto">{actions}</div>
      ) : null}
    </div>
  );
}
