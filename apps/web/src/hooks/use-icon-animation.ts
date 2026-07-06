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
  animateOnHover?: boolean;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
}

function runAfterPaint(run: () => void | Promise<void>) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void run();
    });
  });
}

export function useIconAnimation<T extends IconAnimationHandle>(
  ref: Ref<T>,
  {
    isAnimateOnView = true,
    animateOnHover = true,
    onMouseEnter,
    onMouseLeave,
  }: UseIconAnimationProps = {},
) {
  const controls = useAnimation();
  const isControlledRef = useRef(false);
  const isMountedRef = useRef(false);
  const animationGenerationRef = useRef(0);
  const refElement = useRef<HTMLDivElement>(null);
  const shouldAnimateOnView = isAnimateOnView;
  const isInView = useInView(refElement, {
    once: true,
    amount: 0.3,
    margin: shouldAnimateOnView ? "0px" : "-100000px 0px",
  });

  const safeStart = useCallback(
    async (variant: string, generation = animationGenerationRef.current) => {
      if (
        !isMountedRef.current ||
        generation !== animationGenerationRef.current
      ) {
        return;
      }

      try {
        await controls.start(variant);
      } catch {
        // Motion throws when controls run before mount or after unmount.
      }
    },
    [controls],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      animationGenerationRef.current += 1;
      controls.stop();
    };
  }, [controls]);

  useImperativeHandle(ref, () => {
    return {
      startAnimation: () => {
        isControlledRef.current = true;
        runAfterPaint(() => safeStart("animate"));
      },
      stopAnimation: () => {
        isControlledRef.current = true;
        runAfterPaint(() => safeStart("normal"));
      },
    } as unknown as T;
  }, [safeStart]);

  useEffect(() => {
    if (
      !isMountedRef.current ||
      isControlledRef.current ||
      !isInView ||
      !isAnimateOnView
    ) {
      return;
    }

    const generation = animationGenerationRef.current;
    let cancelled = false;

    runAfterPaint(async () => {
      if (cancelled) return;
      await safeStart("animate", generation);
      if (cancelled) return;
      await safeStart("normal", generation);
    });

    return () => {
      cancelled = true;
      animationGenerationRef.current += 1;
    };
  }, [isInView, isAnimateOnView, safeStart]);

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
        return;
      }
      if (animateOnHover) {
        runAfterPaint(() => safeStart("animate"));
      } else {
        onMouseEnter?.(e);
      }
    },
    [animateOnHover, onMouseEnter, safeStart],
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
        return;
      }
      if (animateOnHover) {
        runAfterPaint(() => safeStart("normal"));
      } else {
        onMouseLeave?.(e);
      }
    },
    [animateOnHover, onMouseLeave, safeStart],
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
