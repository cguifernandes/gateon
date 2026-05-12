"use client";

import * as React from "react";

const MO_BREAKPOINT_PX = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MO_BREAKPOINT_PX - 1}px)`);
    const onChange = () => {
      setIsMobile(mq.matches);
    };
    mq.addEventListener("change", onChange);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
