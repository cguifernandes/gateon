"use client";

import { useCallback, useEffect, useRef } from "react";

const SESSION_VALIDATION_INTERVAL_MS = 60_000;

export function SessionValidator() {
  const isCheckingRef = useRef(false);

  const redirectToLogin = useCallback(() => {
    window.location.assign("/login");
  }, []);

  const validateSession = useCallback(async () => {
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
      }
    } catch {
      // Keep the current page on transient network failures; the next check retries.
    } finally {
      isCheckingRef.current = false;
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void validateSession();

    const intervalId = window.setInterval(
      validateSession,
      SESSION_VALIDATION_INTERVAL_MS,
    );

    const handleFocus = () => {
      void validateSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void validateSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [validateSession]);

  return null;
}
