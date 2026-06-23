"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const TRICKLE_MS = 180;
const HIDE_MS = 220;

function isSameRoute(href: string, pathname: string, search: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    const current = `${pathname}${search}`;
    const next = `${url.pathname}${url.search}`;
    return next === current;
  } catch {
    return true;
  }
}

function shouldStartFromAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return false;
  }
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
    return false;
  }
  if (href.startsWith("tel:")) {
    return false;
  }
  if (href.startsWith("http")) {
    try {
      return new URL(href).origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return true;
}

function NavigationProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeRef = useRef(false);
  const isFirstRouteRender = useRef(true);
  const trickleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTrickle = useCallback(() => {
    if (trickleTimer.current) {
      clearInterval(trickleTimer.current);
      trickleTimer.current = null;
    }
  }, []);

  const runStart = useCallback(() => {
    clearTrickle();
    activeRef.current = true;
    setVisible(true);
    setProgress((current) => (current > 0 && current < 100 ? current : 8));

    trickleTimer.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 90) {
          return current;
        }
        const step = Math.random() * 6 + 2;
        return Math.min(90, current + step);
      });
    }, TRICKLE_MS);
  }, [clearTrickle]);

  const start = useCallback(() => {
    queueMicrotask(runStart);
  }, [runStart]);

  const complete = useCallback(() => {
    if (!activeRef.current) {
      return;
    }
    clearTrickle();
    activeRef.current = false;
    setProgress(100);
    window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, HIDE_MS);
  }, [clearTrickle]);

  const routeKey = `${pathname}?${search}`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: routeKey drives completion on navigation
  useEffect(() => {
    if (isFirstRouteRender.current) {
      isFirstRouteRender.current = false;
      return;
    }
    complete();
  }, [routeKey, complete]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (!shouldStartFromAnchor(anchor)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || isSameRoute(href, pathname, search ? `?${search}` : "")) {
        return;
      }

      start();
    };

    const onPopState = () => start();
    const onNavigationStart = () => start();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("gateon:navigation-start", onNavigationStart);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("gateon:navigation-start", onNavigationStart);
    };
  }, [pathname, search, start]);

  useEffect(() => {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    const wrap =
      (original: typeof history.pushState) =>
      (...args: Parameters<typeof history.pushState>) => {
        const url = args[2];
        if (typeof url === "string") {
          try {
            const nextUrl = new URL(url, window.location.origin);
            const current = `${window.location.pathname}${window.location.search}`;
            const next = `${nextUrl.pathname}${nextUrl.search}`;
            if (next !== current) {
              start();
            }
          } catch {
            /* ignore invalid URLs */
          }
        }
        return original(...args);
      };

    history.pushState = wrap(originalPushState);
    history.replaceState = wrap(originalReplaceState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [start]);

  useEffect(() => clearTrickle, [clearTrickle]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-100 h-[2px] overflow-hidden",
        visible ? "opacity-100" : "opacity-0",
        "transition-opacity duration-200",
      )}
    >
      <div
        className={cn(
          "h-full bg-primary shadow-[0_0_10px] shadow-primary/50",
          "transition-[width] duration-200 ease-out",
          progress >= 100 && "opacity-0",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/** Call before `router.push` / `router.replace` when navigation is not from a link. */
export function notifyNavigationStart() {
  window.dispatchEvent(new Event("gateon:navigation-start"));
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarInner />
    </Suspense>
  );
}
