"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface CircleErrorIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CircleErrorIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  isAnimateOnView?: boolean;
  strokeWidth?: number;
  animateOnHover?: boolean;
}

const FIRST_LINE_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      pathLength: { duration: 0.4, ease: "easeInOut" },
      opacity: { duration: 0.4, ease: "easeInOut" },
    },
  },
};

const SECOND_LINE_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    transition: {
      pathLength: { duration: 0.4, ease: "easeInOut", delay: 0.2 },
      opacity: { duration: 0.4, ease: "easeInOut", delay: 0.2 },
    },
  },
};

const CircleErrorIcon = forwardRef<CircleErrorIconHandle, CircleErrorIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      strokeWidth = 2,
      isAnimateOnView = true,
      animateOnHover = true,
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
        ref={refElement}
        {...eventHandlers}
        role="presentation"
        aria-hidden="true"
        {...props}
      >
        <svg
          aria-label="Circle error icon"
          aria-hidden="true"
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
          <motion.path
            animate={controls}
            d="m15 9-6 6"
            initial="normal"
            variants={FIRST_LINE_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="m9 9 6 6"
            initial="normal"
            variants={SECOND_LINE_VARIANTS}
          />
        </svg>
      </div>
    );
  },
);

CircleErrorIcon.displayName = "CircleErrorIcon";

export { CircleErrorIcon };
