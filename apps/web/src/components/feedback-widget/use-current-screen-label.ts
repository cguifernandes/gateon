"use client";

import { usePathname } from "next/navigation";
import { navSections } from "@/lib/navigation/nav-sections";

const FALLBACK_LABEL = "Outra tela";

export function useCurrentScreenLabel(): { path: string; label: string } {
  const pathname = usePathname();

  for (const section of navSections) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { path: pathname, label: item.label };
      }
    }
  }

  return { path: pathname, label: FALLBACK_LABEL };
}
