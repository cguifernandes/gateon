"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { isPrivateThemeRoute } from "@/lib/ui/theme-routes";

const DASHBOARD_THEME_STORAGE_KEY = "gateon-dashboard-theme";

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const pathname = usePathname();
  const isPrivate = isPrivateThemeRoute(pathname);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={isPrivate}
      forcedTheme={isPrivate ? undefined : "light"}
      storageKey={DASHBOARD_THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
