"use client";

import type { Transition } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { useIconAnimation } from "@/hooks/use-icon-animation";
import { cn } from "@/lib/utils";

export interface EllipsisHorizontalIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface EllipsisHorizontalIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  isAnimateOnView?: boolean;
  animateOnHover?: boolean;
  strokeWidth?: number;
}

const DOT_VARIANTS = {
  normal: { opacity: 1 },
  animate: { opacity: [1, 0, 1] },
};

const ELLIPSIS_DOTS = [
  { id: "left", cx: 5 },
  { id: "middle", cx: 12 },
  { id: "right", cx: 19 },
] as const;

const EllipsisHorizontalIcon = forwardRef<
  EllipsisHorizontalIconHandle,
  EllipsisHorizontalIconProps
>(
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
        {...eventHandlers}
        ref={refElement}
        role="presentation"
        aria-hidden="true"
        {...props}
      >
        <svg
          aria-label="Ellipsis horizontal icon"
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
          {ELLIPSIS_DOTS.map((dot, index) => {
            const transition: Transition = {
              duration: 0.45,
              ease: "easeInOut",
              times: [0, 0.5, 1],
              delay: index * 0.12,
            };

            return (
              <motion.circle
                key={dot.id}
                animate={controls}
                cx={dot.cx}
                cy={12}
                fill="currentColor"
                r={2}
                stroke="none"
                transition={transition}
                variants={DOT_VARIANTS}
              />
            );
          })}
        </svg>
      </div>
    );
  },
);

EllipsisHorizontalIcon.displayName = "EllipsisHorizontalIcon";

export { EllipsisHorizontalIcon };
