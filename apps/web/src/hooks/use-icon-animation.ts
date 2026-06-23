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

function runAfterMount(run: () => void | Promise<void>) {
  requestAnimationFrame(() => {
    void run();
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
  const refElement = useRef<HTMLDivElement>(null);
  const shouldAnimateOnView = isAnimateOnView;
  const isInView = useInView(refElement, {
    once: true,
    amount: 0.1,
    margin: shouldAnimateOnView ? "0px" : "-100000px 0px",
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useImperativeHandle(ref, () => {
    return {
      startAnimation: () => {
        isControlledRef.current = true;
        runAfterMount(() => controls.start("animate"));
      },
      stopAnimation: () => {
        isControlledRef.current = true;
        runAfterMount(() => controls.start("normal"));
      },
    } as unknown as T;
  }, [controls]);

  useEffect(() => {
    if (
      !isMountedRef.current ||
      isControlledRef.current ||
      !isInView ||
      !isAnimateOnView
    ) {
      return;
    }

    let cancelled = false;

    runAfterMount(async () => {
      if (cancelled || !isMountedRef.current) return;
      await controls.start("animate");
      if (cancelled || !isMountedRef.current) return;
      await controls.start("normal");
    });

    return () => {
      cancelled = true;
    };
  }, [controls, isInView, isAnimateOnView]);

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
        return;
      }
      if (animateOnHover) {
        runAfterMount(() => controls.start("animate"));
      } else {
        onMouseEnter?.(e);
      }
    },
    [animateOnHover, controls, onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
        return;
      }
      if (animateOnHover) {
        runAfterMount(() => controls.start("normal"));
      } else {
        onMouseLeave?.(e);
      }
    },
    [animateOnHover, controls, onMouseLeave],
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
