import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/data/get-session";
import { readSidebarOpenFromCookies } from "@/lib/ui/sidebar-storage";
import { DashboardProviders } from "./_components/dashboard-providers";
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

  const cookieStore = await cookies();
  const sidebarDefaultOpen = readSidebarOpenFromCookies(cookieStore);

  return (
    <div className="flex h-svh min-h-0">
      <SessionValidator />
      <DashboardProviders planId={user.planId}>
        <DashboardShell user={user} sidebarDefaultOpen={sidebarDefaultOpen}>
          {children}
        </DashboardShell>
      </DashboardProviders>
    </div>
  );
}
