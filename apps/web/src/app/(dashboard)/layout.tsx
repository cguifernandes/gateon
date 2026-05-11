import Link from "next/link";
import { redirect } from "next/navigation";
import { GateonLogo } from "@/components/gateon-logo";
import { getSessionUser } from "@/lib/server/get-session";
import { LogoutForm } from "../../components/logout-form";
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
    <div className="flex min-h-full flex-col bg-background">
      <SessionValidator />
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            className="flex items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/dashboard"
          >
            <GateonLogo />
          </Link>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden truncate sm:inline" title={user.email}>
              {user.email}
            </span>
            <LogoutForm />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
