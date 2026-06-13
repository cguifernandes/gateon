"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { iconSizeClass } from "@/lib/icon-size-class";
import { cn } from "@/lib/utils";

export interface PlugIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface PlugIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  isAnimateOnView?: boolean;
  animateOnHover?: boolean;
}

/** Plug body + cable slide down as if inserting into a socket. */
const PLUG_BODY_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: {
    y: [0, 3, 1.5],
    transition: {
      duration: 0.5,
      times: [0, 0.55, 1],
      ease: "easeInOut",
    },
  },
};

/** Prongs lead the motion slightly before the body settles. */
const PLUG_PRONGS_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: {
    y: [0, 4, 2],
    transition: {
      duration: 0.45,
      times: [0, 0.5, 1],
      ease: "easeInOut",
    },
  },
};

const PlugIcon = forwardRef<PlugIconHandle, PlugIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      isAnimateOnView = true,
      animateOnHover = true,
      size = 28,
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
        className={cn("flex shrink-0 items-center justify-center", className)}
        ref={refElement}
        {...eventHandlers}
        role="presentation"
        aria-hidden="true"
        {...props}
      >
        <svg
          className={iconSizeClass(size)}
          fill="none"
          height={size}
          width={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
          aria-hidden="true"
        >
          <motion.g animate={controls} initial="normal" variants={PLUG_PRONGS_VARIANTS}>
            <path d="M15 8V2" />
            <path d="M9 8V2" />
          </motion.g>
          <motion.g animate={controls} initial="normal" variants={PLUG_BODY_VARIANTS}>
            <path d="M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z" />
            <path d="M12 22v-5" />
          </motion.g>
        </svg>
      </div>
    );
  },
);

PlugIcon.displayName = "PlugIcon";

export { PlugIcon };
