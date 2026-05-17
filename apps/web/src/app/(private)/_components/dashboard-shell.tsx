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
};

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <SidebarProvider className="min-h-0 flex-1">
      <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border">
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden rounded-br-xl">
          <Header user={user} />
          <main className="min-h-0 flex-1 overflow-y-auto bg-background overscroll-contain relative">
            <Container className="p-4">{children}</Container>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
