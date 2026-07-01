"use client";

import { motion, useSpring } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberFlowProps {
  startValue: number;
  finalValue: number;
  className?: string;
  suffix?: string;
  prefix?: string | ReactNode;
}

export function AnimatedNumberFlow({
  startValue,
  finalValue,
  className,
  suffix,
  prefix,
}: AnimatedNumberFlowProps) {
  const [displaySubs, setDisplaySubs] = useState(startValue);

  const springSubCount = useSpring(0, {
    bounce: 0,
    duration: 1000,
  });

  springSubCount.on("change", (value) => {
    const shouldAnimateAsInteger =
      Number.isInteger(startValue) && Number.isInteger(finalValue);

    const formattedValue = shouldAnimateAsInteger
      ? Math.round(value)
      : Number(value.toFixed(2));

    setDisplaySubs(formattedValue);
  });

  useEffect(() => {
    springSubCount.set(finalValue);
  }, [finalValue, springSubCount]);

  return (
    <motion.div
      className={cn(
        suffix ? "flex items-baseline gap-0.5" : undefined,
        className,
      )}
    >
      <span>
        {prefix}
        {displaySubs}
        {suffix}
      </span>
    </motion.div>
  );
}
