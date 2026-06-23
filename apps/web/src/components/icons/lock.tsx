"use client";

import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface LockIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface LockIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  isAnimateOnView?: boolean;
  animateOnHover?: boolean;
  strokeWidth?: number;
}

const LockIcon = forwardRef<LockIconHandle, LockIconProps>(
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
      onMouseEnter,
      onMouseLeave,
      animateOnHover,
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
        <motion.svg
          aria-label="Lock icon"
          aria-hidden="true"
          animate={controls}
          fill="none"
          height={size}
          initial="normal"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          transition={{
            duration: 1,
            ease: [0.4, 0, 0.2, 1],
          }}
          variants={{
            normal: {
              rotate: 0,
              scale: 1,
            },
            animate: {
              rotate: [-3, 1, -2, 0],
              scale: [0.95, 1.05, 0.98, 1],
            },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
          <motion.path
            animate={controls}
            d="M7 11V7a5 5 0 0 1 10 0v4"
            initial="normal"
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            variants={{
              normal: {
                pathLength: 1,
              },
              animate: {
                pathLength: 0.7,
              },
            }}
          />
        </motion.svg>
      </div>
    );
  },
);

LockIcon.displayName = "LockIcon";

export { LockIcon };
