"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { iconSizeClass } from "@/lib/icon-size-class";
import { cn } from "@/lib/utils";

export interface MessageCircleIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MessageCircleIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  strokeWidth?: number;
  isAnimateOnView?: boolean;
}

const ICON_VARIANTS: Variants = {
  normal: {
    scale: 1,
    rotate: 0,
  },
  animate: {
    scale: 1.05,
    rotate: [0, -7, 7, 0],
    transition: {
      rotate: {
        duration: 0.5,
        ease: "easeInOut",
      },
      scale: {
        type: "spring",
        stiffness: 400,
        damping: 10,
      },
    },
  },
};

const MessageCircleIcon = forwardRef<
  MessageCircleIconHandle,
  MessageCircleIconProps
>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      isAnimateOnView = true,
      size = 28,
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
        {...eventHandlers}
        {...props}
        role="presentation"
        aria-hidden="true"
        {...props}
      >
        <motion.svg
          animate={controls}
          className={iconSizeClass(size)}
          fill="none"
          height={size}
          width={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          variants={ICON_VARIANTS}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
          aria-hidden="true"
        >
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </motion.svg>
      </div>
    );
  },
);

MessageCircleIcon.displayName = "MessageCircleIcon";

export { MessageCircleIcon };
