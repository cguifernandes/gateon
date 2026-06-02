"use client";

import { HashIcon } from "lucide-react";
import { ImageComponent } from "@/components/image-component";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AvatarStackItem = {
  id: string;
  name: string;
  tooltip: string;
  imageSrc: string | null;
  imageAlt: string;
  kind?: "group" | "member" | "topic";
};

type AvatarStackProps = {
  items: AvatarStackItem[];
  maxVisible?: number;
  avatarClassName?: string;
  overflowButtonClassName?: string;
};

const DEFAULT_MAX_VISIBLE = 6;

function AvatarStackIcon({
  item,
  className,
}: {
  item: AvatarStackItem;
  className?: string;
}) {
  if (item.kind === "topic" && !item.imageSrc) {
    return (
      <span
        className={cn(
          "flex size-full items-center justify-center bg-sky-500/15",
          className,
        )}
      >
        <HashIcon className="size-3.5 text-sky-600 dark:text-sky-300" />
      </span>
    );
  }

  return (
    <ImageComponent
      src={item.imageSrc}
      alt={item.imageAlt}
      width={32}
      height={32}
      sizes="32px"
      className={cn("size-full object-cover", className)}
    />
  );
}

export function AvatarStack({
  items,
  maxVisible = DEFAULT_MAX_VISIBLE,
  avatarClassName,
  overflowButtonClassName,
}: AvatarStackProps) {
  if (items.length === 0) return null;

  const visibleItems = items.slice(0, maxVisible);
  const overflowItems = items.slice(maxVisible);
  const overflowCount = overflowItems.length;

  return (
    <div className="flex items-center">
      {visibleItems.map((item, index) => (
        <Tooltip key={item.id}>
          <TooltipTrigger
            render={(triggerProps) => (
              <button
                {...triggerProps}
                type="button"
                aria-label={item.name}
                className={cn(
                  "relative inline-flex size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-card transition-transform hover:z-20 hover:scale-110",
                  index > 0 && "-ml-2",
                  avatarClassName,
                )}
                style={{ zIndex: index + 1 }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <AvatarStackIcon item={item} />
              </button>
            )}
          />
          <TooltipContent side="top">{item.tooltip}</TooltipContent>
        </Tooltip>
      ))}

      {overflowCount > 0 ? (
        <Tooltip>
          <TooltipTrigger
            render={(triggerProps) => (
              <button
                {...triggerProps}
                type="button"
                aria-label={`Mais ${overflowCount} destino(s)`}
                className={cn(
                  "relative -ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-foreground text-xs ring-2 ring-card transition-transform hover:z-20 hover:scale-110",
                  overflowButtonClassName,
                )}
                style={{ zIndex: visibleItems.length + 1 }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                +{overflowCount}
              </button>
            )}
          />
          <TooltipContent side="top" className="max-w-xs">
            <ul className="space-y-1">
              {overflowItems.map((item) => (
                <li key={item.id}>{item.tooltip}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
