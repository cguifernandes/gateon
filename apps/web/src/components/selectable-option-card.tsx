"use client";

import {
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
  useRef,
} from "react";
import {
  ArrowRightIcon,
  type ArrowRightIconHandle,
} from "@/components/icons/arrow-right";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import type { IconAnimationHandle } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

type AnimatedIconComponent = ForwardRefExoticComponent<
  { size?: number } & RefAttributes<IconAnimationHandle>
>;

export type SelectableOptionCardProps = {
  title: string;
  description: string;
  isSelected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
  media?: ReactNode;
  mediaVariant?: "icon" | "logo";
  AnimatedIcon?: AnimatedIconComponent;
  headerAction?: ReactNode;
  actionLabel?: string;
  hideAction?: boolean;
  mediaClassName?: string;
};

export function SelectableOptionCard({
  title,
  description,
  isSelected = false,
  disabled = false,
  onSelect,
  className,
  media,
  mediaVariant = "icon",
  AnimatedIcon,
  headerAction,
  actionLabel = "Selecionar",
  hideAction = false,
  mediaClassName,
}: SelectableOptionCardProps) {
  const iconRef = useRef<IconAnimationHandle | null>(null);
  const arrowRef = useRef<ArrowRightIconHandle | null>(null);

  function playAnimations() {
    iconRef.current?.startAnimation();
    arrowRef.current?.startAnimation();
  }

  function stopAnimations() {
    iconRef.current?.stopAnimation();
    arrowRef.current?.stopAnimation();
  }

  const isInteractive = !disabled;

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={isInteractive ? playAnimations : undefined}
      onMouseLeave={isInteractive ? stopAnimations : undefined}
      onClick={() => {
        if (!isInteractive) return;
        playAnimations();
        if (isSelected) return;
        onSelect?.();
      }}
      className={cn(
        "group relative flex h-full flex-col justify-between gap-y-3 rounded-2xl border border-border p-4 text-left transition-all duration-200",
        isInteractive &&
          "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
        isSelected && isInteractive && "border-primary/60 bg-primary/10",
        disabled && "cursor-not-allowed opacity-70",
        className,
      )}
    >
      <div className="flex flex-col gap-y-3">
        <div
          className={cn(
            mediaVariant === "icon" &&
              "inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary",
            mediaVariant === "logo" &&
              "flex h-12 w-20 items-center justify-center rounded-lg border border-border bg-background px-2",
            mediaClassName,
          )}
        >
          {AnimatedIcon ? <AnimatedIcon ref={iconRef} size={18} /> : media}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold font-heading text-base">{title}</h3>
          </div>
          <TruncatedTextTooltip
            text={description}
            variant="line-clamp"
            lineClamp={3}
            className="font-light cursor-pointer! text-muted-foreground text-sm"
          />
        </div>
      </div>

      {headerAction ? (
        <div className="absolute top-4 right-4">{headerAction}</div>
      ) : null}

      {!hideAction && isInteractive ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-primary text-sm">
          {actionLabel}
          <ArrowRightIcon
            ref={arrowRef}
            size={16}
            isAnimateOnView={false}
            className="text-primary"
          />
        </span>
      ) : null}
    </button>
  );
}
