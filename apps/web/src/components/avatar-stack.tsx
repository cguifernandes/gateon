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
          "flex size-full items-center justify-center bg-primary",
          className,
        )}
      >
        <HashIcon className="size-3.5 text-primary-foreground" />
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
  const isTopicStack =
    items.length > 0 && items.every((item) => item.kind === "topic");

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
                  "relative inline-flex size-9 shrink-0 overflow-hidden rounded-full border border-border transition-transform hover:z-20 hover:scale-110",
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
                  "relative -ml-2 inline-flex shrink-0 items-center justify-center rounded-full font-medium text-xs transition-transform hover:z-20 hover:scale-110",
                  isTopicStack
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                  avatarClassName ?? "size-8",
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
