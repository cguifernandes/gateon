"use client";

import type { ReactNode } from "react";
import { Container } from "@/components/container";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { PublicUserDto } from "@/lib/zod/auth-schemas";
import { LimitGroups } from "../groups/_components/limit-groups";
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
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <AppSidebar user={user} />
        <SidebarInset className="min-h-0 overflow-hidden">
          <Header user={user} />
          <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-background overscroll-contain">
            <LimitGroups />
            <Container className="flex min-h-0 flex-1 flex-col p-4">
              {children}
            </Container>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
