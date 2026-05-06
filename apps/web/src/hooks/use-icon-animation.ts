"use client";

import { useAnimation, useInView } from "motion/react";
import {
  type MouseEvent,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export interface IconAnimationHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface UseIconAnimationProps {
  isAnimateOnView?: boolean;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
}

export function useIconAnimation<T extends IconAnimationHandle>(
  ref: Ref<T>,
  {
    isAnimateOnView = true,
    onMouseEnter,
    onMouseLeave,
  }: UseIconAnimationProps = {},
) {
  const controls = useAnimation();
  const isControlledRef = useRef(false);
  const refElement = useRef<HTMLDivElement>(null);
  const isInView = useInView(refElement, { once: true, amount: 0.1 });

  useImperativeHandle(ref, () => {
    return {
      startAnimation: () => {
        isControlledRef.current = true;
        return controls.start("animate");
      },
      stopAnimation: () => {
        isControlledRef.current = true;
        return controls.start("normal");
      },
    } as unknown as T;
  }, [controls]);

  useEffect(() => {
    if (!isControlledRef.current && isInView && isAnimateOnView) {
      (async () => {
        await controls.start("animate");
        await controls.start("normal");
      })();
    }
  }, [controls, isInView, isAnimateOnView]);

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave],
  );

  return {
    controls,
    refElement,
    eventHandlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}
