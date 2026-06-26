"use client";

import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface MinusIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MinusIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  isAnimateOnView?: boolean;
  animateOnHover?: boolean;
}

const MinusIcon = forwardRef<MinusIconHandle, MinusIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      strokeWidth = 2,
      animateOnHover,
      isAnimateOnView = true,
      ...props
    },
    ref,
  ) => {
    const { controls, refElement, eventHandlers } = useIconAnimation(ref, {
      isAnimateOnView,
      onMouseEnter,
      animateOnHover,
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
          aria-label="Minus icon"
          aria-hidden="true"
          animate={controls}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          variants={{
            normal: {
              opacity: 1,
              scale: 1,
            },
            animate: {
              opacity: 0.5,
              scale: 0.85,
            },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5 12h14" />
        </motion.svg>
      </div>
    );
  },
);

MinusIcon.displayName = "MinusIcon";

export { MinusIcon };
