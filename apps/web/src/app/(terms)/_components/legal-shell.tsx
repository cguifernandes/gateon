"use client";

import type { ReactNode } from "react";
import { Container } from "@/components/container";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { LegalAppSidebar } from "./legal-app-sidebar";
import { LegalHeader } from "./legal-header";

type LegalShellProps = {
  children: ReactNode;
  sidebarDefaultOpen?: boolean;
};

export function LegalShell({
  children,
  sidebarDefaultOpen = true,
}: LegalShellProps) {
  return (
    <SidebarProvider
      className="min-h-0 flex-1"
      defaultOpen={sidebarDefaultOpen}
    >
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <LegalAppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <LegalHeader />
          <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-background overscroll-contain">
            <Container className="flex min-h-0 flex-1 flex-col p-4 py-8 md:py-10">
              {children}
            </Container>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
