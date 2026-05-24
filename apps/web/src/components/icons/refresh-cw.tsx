"use client";

import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { iconSizeClass } from "@/lib/icon-size-class";
import { cn } from "@/lib/utils";

export interface RefreshCWIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface RefreshCWIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  isAnimateOnView?: boolean;
}

const RefreshCWIcon = forwardRef<RefreshCWIconHandle, RefreshCWIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      strokeWidth = 2,
      isAnimateOnView = true,
      ...props
    },
    ref,
  ) => {
    const { controls, refElement, eventHandlers } = useIconAnimation(ref, {
      isAnimateOnView,
      onMouseEnter,
      onMouseLeave,
    });

    return (
      <div
        className={cn("flex shrink-0 items-center justify-center", className)}
        role="presentation"
        {...eventHandlers}
        aria-hidden="true"
        ref={refElement}
        {...props}
      >
        <motion.svg
          aria-label="Refresh CW icon"
          aria-hidden="true"
          animate={controls}
          className={iconSizeClass(size)}
          fill="none"
          height={size}
          width={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          transition={{ type: "spring", stiffness: 250, damping: 25 }}
          variants={{
            normal: { rotate: "0deg" },
            animate: { rotate: "50deg" },
          }}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </motion.svg>
      </div>
    );
  },
);

RefreshCWIcon.displayName = "RefreshCWIcon";

export { RefreshCWIcon };
