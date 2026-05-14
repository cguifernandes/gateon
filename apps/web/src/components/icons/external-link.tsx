"use client";

import type { Transition, Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface ExternalLinkIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ExternalLinkIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  isAnimateOnView?: boolean;
  strokeWidth?: number;
}

const ARROW_TRANSITION: Transition = {
  duration: 0.45,
  ease: "easeInOut",
};

const ARROW_VARIANTS: Variants = {
  normal: {
    x: 0,
    y: 0,
  },
  animate: {
    x: [0, 1.5, 0],
    y: [0, -1.5, 0],
  },
};

const CORNER_VARIANTS: Variants = {
  normal: {
    x: 0,
    y: 0,
  },
  animate: {
    x: [0, 1.5, 0],
    y: [0, -1.5, 0],
  },
};

const ExternalLinkIcon = forwardRef<
  ExternalLinkIconHandle,
  ExternalLinkIconProps
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
        {...eventHandlers}
        role="presentation"
        aria-hidden="true"
        {...props}
        ref={refElement}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "lucide lucide-external-link-icon lucide-external-link",
            className,
          )}
          aria-label="External link icon"
          aria-hidden="true"
        >
          <motion.path
            d="M15 3h6v6"
            animate={controls}
            initial="normal"
            transition={ARROW_TRANSITION}
            variants={CORNER_VARIANTS}
          />
          <motion.path
            d="M10 14 21 3"
            animate={controls}
            initial="normal"
            transition={ARROW_TRANSITION}
            variants={ARROW_VARIANTS}
          />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      </div>
    );
  },
);

ExternalLinkIcon.displayName = "ExternalLinkIcon";

export { ExternalLinkIcon };
