"use client";

import { useEffect, useState } from "react";

const DEFAULT_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, delayMs = DEFAULT_DEBOUNCE_MS) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
