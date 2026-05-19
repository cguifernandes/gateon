"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface MonitorIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MonitorIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  isAnimateOnView?: boolean;
}

const SCREEN_FRAME_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
  },
  animate: {
    pathLength: [0, 1],
    transition: {
      delay: 0,
      duration: 0.4,
    },
  },
};

const PATH_VARIANTS: Variants = {
  normal: {
    pathLength: 1,
  },
  animate: {
    pathLength: [0, 1],
    transition: {
      delay: 0.2,
      duration: 0.4,
    },
  },
};

const MonitorIcon = forwardRef<MonitorIconHandle, MonitorIconProps>(
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
        ref={refElement}
        role="presentation"
        {...eventHandlers}
        aria-hidden="true"
        {...props}
      >
        <motion.svg
          aria-label="Monitor icon"
          aria-hidden="true"
          animate={controls}
          fill="none"
          height={size}
          initial="normal"
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
            d="M 4 3 H 20 A 2 2 0 0 1 22 5 V 15 A 2 2 0 0 1 20 17 H 4 A 2 2 0 0 1 2 15 V 5 A 2 2 0 0 1 4 3 Z"
            fill="none"
            initial="normal"
            variants={SCREEN_FRAME_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M8 21h8"
            initial="normal"
            variants={PATH_VARIANTS}
          />
          <motion.path
            animate={controls}
            d="M12 17v4"
            initial="normal"
            variants={PATH_VARIANTS}
          />
        </motion.svg>
      </div>
    );
  },
);

MonitorIcon.displayName = "MonitorIcon";

export { MonitorIcon };
