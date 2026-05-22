"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface UserRoundMinusIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UserRoundMinusIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  isAnimateOnView?: boolean;
  strokeWidth?: number;
}

const HORIZONTAL_BAR_VARIANTS: Variants = {
  normal: {
    opacity: 1,
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: {
      delay: 0.3,
      duration: 0.2,
      opacity: { duration: 0.1, delay: 0.3 },
    },
  },
};

const UserRoundMinusIcon = forwardRef<
  UserRoundMinusIconHandle,
  UserRoundMinusIconProps
>(
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
        className={cn(className)}
        ref={refElement}
        role="presentation"
        {...eventHandlers}
        {...props}
      >
        <motion.svg
          aria-label="User round minus icon"
          aria-hidden="true"
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
          <path d="M2 21a8 8 0 0 1 13.292-6" />
          <circle cx="10" cy="8" r="5" />
          <motion.path
            animate={controls}
            d="M22 19h-6"
            initial="normal"
            variants={HORIZONTAL_BAR_VARIANTS}
          />
        </motion.svg>
      </div>
    );
  },
);

UserRoundMinusIcon.displayName = "UserRoundMinusIcon";

export { UserRoundMinusIcon };
