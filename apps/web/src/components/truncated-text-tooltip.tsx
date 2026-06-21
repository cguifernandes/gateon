"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function isSingleLineTruncated(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth + 1;
}

function isLineClampTruncated(element: HTMLElement): boolean {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.className = [...element.classList]
    .filter((className) => !className.startsWith("line-clamp-"))
    .join(" ");
  clone.style.position = "fixed";
  clone.style.inset = "auto";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.display = "block";
  clone.style.setProperty("-webkit-line-clamp", "unset");
  clone.style.setProperty("line-clamp", "unset");
  clone.style.width = `${element.clientWidth}px`;

  document.body.appendChild(clone);
  const fullHeight = clone.getBoundingClientRect().height;
  const clampedHeight = element.getBoundingClientRect().height;
  document.body.removeChild(clone);

  return fullHeight > clampedHeight + 1;
}

function isTextTruncated(
  element: HTMLElement,
  variant: "truncate" | "line-clamp",
): boolean {
  return variant === "truncate"
    ? isSingleLineTruncated(element)
    : isLineClampTruncated(element);
}

type TruncatedTextTooltipProps = {
  text: string;
  className?: string;
  triggerClassName?: string;
  /** Single-line ellipsis (`truncate`) or multi-line clamp. */
  variant?: "truncate" | "line-clamp";
  lineClamp?: 2 | 3;
  tooltipClassName?: string;
};

export function TruncatedTextTooltip({
  text,
  className,
  triggerClassName,
  variant = "truncate",
  lineClamp = 2,
  tooltipClassName,
}: TruncatedTextTooltipProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    const element = ref.current;
    if (!element || text.length === 0) {
      setIsTruncated(false);
      return;
    }
    setIsTruncated(isTextTruncated(element, variant));
  }, [variant, text]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const runCheck = () => {
      requestAnimationFrame(() => {
        checkTruncation();
      });
    };

    runCheck();

    const observer = new ResizeObserver(runCheck);
    observer.observe(element);
    if (element.parentElement) {
      observer.observe(element.parentElement);
    }

    return () => observer.disconnect();
  }, [checkTruncation]);

  const textClassName = cn(
    variant === "truncate" && "truncate",
    variant === "line-clamp" &&
      (lineClamp === 3 ? "line-clamp-3" : "line-clamp-2"),
    className,
  );

  return (
    <Tooltip disabled={!isTruncated}>
      <TooltipTrigger
        className={cn(
          "block min-w-0 w-full max-w-full cursor-default text-left",
          variant === "truncate" && "overflow-hidden",
          triggerClassName,
        )}
        render={(triggerProps) => (
          <p
            {...triggerProps}
            ref={(node) => {
              ref.current = node;
              const triggerRef = triggerProps.ref;
              if (typeof triggerRef === "function") {
                triggerRef(node);
              } else if (triggerRef && "current" in triggerRef) {
                triggerRef.current = node;
              }
            }}
            className={cn(
              textClassName,
              variant === "truncate" && "block w-full min-w-0",
              triggerProps.className,
            )}
          >
            {text}
          </p>
        )}
      />
      <TooltipContent
        side="top"
        className={cn("max-w-sm break-all text-pretty", tooltipClassName)}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
