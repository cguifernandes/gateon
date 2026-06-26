import { cookies } from "next/headers";
import { readSidebarOpenFromCookies } from "@/lib/ui/sidebar-storage";
import { LegalShell } from "./_components/legal-shell";

type LegalLayoutProps = {
  children: React.ReactNode;
};

export default async function LegalLayout({ children }: LegalLayoutProps) {
  const cookieStore = await cookies();
  const sidebarDefaultOpen = readSidebarOpenFromCookies(cookieStore);

  return (
    <div className="flex h-svh min-h-0">
      <LegalShell sidebarDefaultOpen={sidebarDefaultOpen}>
        {children}
      </LegalShell>
    </div>
  );
}
