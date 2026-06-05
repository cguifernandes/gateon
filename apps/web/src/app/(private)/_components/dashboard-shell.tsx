"use client";

import type { ReactNode } from "react";
import { Container } from "@/components/container";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { PublicUserDto } from "@/lib/zod/auth-schemas";
import { AppSidebar } from "./app-sidebar";
import { Header } from "./header";

type DashboardShellProps = {
  user: PublicUserDto;
  children: ReactNode;
  sidebarDefaultOpen?: boolean;
};

export function DashboardShell({
  user,
  children,
  sidebarDefaultOpen = true,
}: DashboardShellProps) {
  return (
    <SidebarProvider
      className="min-h-0 flex-1"
      defaultOpen={sidebarDefaultOpen}
    >
      <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden rounded-br-xl">
          <Header user={user} />
          <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-background overscroll-contain">
            <Container className="flex min-h-0 flex-1 flex-col p-4">
              {children}
            </Container>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
