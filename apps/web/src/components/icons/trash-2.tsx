"use client";

import type { Transition } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface Trash2IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface Trash2IconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  isAnimateOnView?: boolean;
  animateOnHover?: boolean;
  strokeWidth?: number;
}

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 18,
  mass: 0.8,
};

const Trash2Icon = forwardRef<Trash2IconHandle, Trash2IconProps>(
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
        ref={refElement}
        role="presentation"
        aria-hidden="true"
        {...eventHandlers}
        {...props}
      >
        <svg
          aria-label="Trash icon"
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
            d="M10 11v6"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateY: 0 },
              animate: { translateY: 1 },
            }}
          />
          <motion.path
            animate={controls}
            d="M14 11v6"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateY: 0 },
              animate: { translateY: 1 },
            }}
          />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M3 6h18" />
          <motion.path
            animate={controls}
            d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateY: 0 },
              animate: { translateY: -2 },
            }}
          />
        </svg>
      </div>
    );
  },
);

Trash2Icon.displayName = "Trash2Icon";

export { Trash2Icon };
