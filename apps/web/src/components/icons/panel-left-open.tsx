"use client";

import type { Transition, Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface PanelLeftOpenIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PanelLeftOpenIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  isAnimateOnView?: boolean;
  animateOnHover?: boolean;
  strokeWidth?: number;
}

const DEFAULT_TRANSITION: Transition = {
  times: [0, 0.4, 1],
  duration: 0.5,
};

const PATH_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: { x: [0, 1.5, 0] },
};

const PanelLeftOpenIcon = forwardRef<
  PanelLeftOpenIconHandle,
  PanelLeftOpenIconProps
>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      isAnimateOnView = true,
      animateOnHover = true,
      strokeWidth = 2,
      ...props
    },
    ref,
  ) => {
    const { controls, refElement, eventHandlers } = useIconAnimation(ref, {
      isAnimateOnView,
      animateOnHover,
      onMouseEnter,
      onMouseLeave,
    });

    return (
      <div
        className={cn(className)}
        {...eventHandlers}
        ref={refElement}
        role="presentation"
        aria-hidden="true"
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
          aria-hidden="true"
        >
          <rect height="18" rx="2" width="18" x="3" y="3" />
          <path d="M9 3v18" />
          <motion.path
            animate={controls}
            d="m14 9 3 3-3 3"
            transition={DEFAULT_TRANSITION}
            variants={PATH_VARIANTS}
          />
        </svg>
      </div>
    );
  },
);

PanelLeftOpenIcon.displayName = "PanelLeftOpenIcon";

export { PanelLeftOpenIcon };
