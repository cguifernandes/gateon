"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface ArrowRightIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ArrowRightIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  isAnimateOnView?: boolean;
}

const PATH_VARIANTS: Variants = {
  normal: { d: "M5 12h14" },
  animate: {
    d: ["M5 12h14", "M5 12h9", "M5 12h14"],
    transition: {
      duration: 0.4,
    },
  },
};

const SECONDARY_PATH_VARIANTS: Variants = {
  normal: { d: "m12 5 7 7-7 7", translateX: 0 },
  animate: {
    d: "m12 5 7 7-7 7",
    translateX: [0, -3, 0],
    transition: {
      duration: 0.4,
    },
  },
};

const ArrowRightIcon = forwardRef<ArrowRightIconHandle, ArrowRightIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
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
        className={cn(className)}
        ref={refElement}
        {...eventHandlers}
        {...props}
        role="presentation"
        aria-hidden="true"
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
          aria-hidden="true"
        >
          <motion.path
            animate={controls}
            d="M5 12h14"
            variants={PATH_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="m12 5 7 7-7 7"
            variants={SECONDARY_PATH_VARIANTS}
          />
        </svg>
      </div>
    );
  },
);

ArrowRightIcon.displayName = "ArrowRightIcon";

export { ArrowRightIcon };
