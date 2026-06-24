"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function LegalHeader() {
  return (
    <header className="flex h-14 w-full shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <SidebarTrigger />
    </header>
  );
}
