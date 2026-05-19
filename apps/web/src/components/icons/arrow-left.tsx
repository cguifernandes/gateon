"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface ArrowLeftIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ArrowLeftIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  isAnimateOnView?: boolean;
}

const PATH_VARIANTS: Variants = {
  normal: { d: "m12 19-7-7 7-7", translateX: 0 },
  animate: {
    d: "m12 19-7-7 7-7",
    translateX: [0, 3, 0],
    transition: {
      duration: 0.4,
    },
  },
};

const SECOND_PATH_VARIANTS: Variants = {
  normal: { d: "M19 12H5" },
  animate: {
    d: ["M19 12H5", "M19 12H10", "M19 12H5"],
    transition: {
      duration: 0.4,
    },
  },
};

const ArrowLeftIcon = forwardRef<ArrowLeftIconHandle, ArrowLeftIconProps>(
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
        className={cn(className)}
        ref={refElement}
        role="presentation"
        {...eventHandlers}
        {...props}
      >
        <svg
          aria-label="Arrow left icon"
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
          <motion.path
            animate={controls}
            d="m12 19-7-7 7-7"
            variants={PATH_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M19 12H5"
            variants={SECOND_PATH_VARIANTS}
          />
        </svg>
      </div>
    );
  },
);

ArrowLeftIcon.displayName = "ArrowLeftIcon";

export { ArrowLeftIcon };
