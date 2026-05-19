"use client";

import type { Transition, Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface MoonIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MoonIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  isAnimateOnView?: boolean;
}

const SVG_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: [0, -10, 10, -5, 5, 0],
  },
};

const SVG_TRANSITION: Transition = {
  duration: 1.2,
  ease: "easeInOut",
};

const MoonIcon = forwardRef<MoonIconHandle, MoonIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      isAnimateOnView = true,
      strokeWidth = 2,
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
        ref={refElement}
        role="presentation"
        {...eventHandlers}
        aria-hidden="true"
        className={cn(className)}
        {...props}
      >
        <motion.svg
          aria-hidden="true"
          animate={controls}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          transition={SVG_TRANSITION}
          variants={SVG_VARIANTS}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </motion.svg>
      </div>
    );
  },
);

MoonIcon.displayName = "MoonIcon";

export { MoonIcon };
