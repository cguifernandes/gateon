"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface MailboxIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MailboxIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  isAnimateOnView?: boolean;
  strokeWidth?: number;
  animateOnHover?: boolean;
}

const FLAG_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 18,
    },
  },
  animate: {
    rotate: -90,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 12,
      mass: 1,
    },
  },
};

const MailboxIcon = forwardRef<MailboxIconHandle, MailboxIconProps>(
  (
    {
      onMouseEnter,
      onMouseLeave,
      className,
      size = 28,
      animateOnHover,
      strokeWidth = 2,
      isAnimateOnView = true,
      ...props
    },
    ref,
  ) => {
    const { controls, refElement, eventHandlers } = useIconAnimation(ref, {
      isAnimateOnView,
      animateOnHover,
    });

    return (
      <div
        className={cn(className)}
        {...eventHandlers}
        {...props}
        ref={refElement}
        role="presentation"
        aria-hidden="true"
      >
        <svg
          className="overflow-visible"
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          aria-label="Mail box icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" />
          <motion.path
            animate={controls}
            d="M18 11V9H15"
            initial="normal"
            style={{ transformOrigin: "18px 11px" }}
            variants={FLAG_VARIANTS}
          />
          <path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2" />
          <line x1="6" x2="7" y1="10" y2="10" />
        </svg>
      </div>
    );
  },
);

MailboxIcon.displayName = "MailboxIcon";

export { MailboxIcon };
