import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/get-session";
import { DashboardShell } from "./_components/dashboard-shell";
import { SessionValidator } from "./_components/session-validator";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-svh min-h-0 flex-col bg-linear-to-b from-surface-container to-surface-bright p-2">
      <SessionValidator />
      <DashboardShell user={user}>{children}</DashboardShell>
    </div>
  );
}
