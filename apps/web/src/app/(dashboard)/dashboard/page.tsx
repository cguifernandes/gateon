import type { Metadata } from "next";
import { getSessionUser } from "@/lib/server/get-session";
import { DashboardOverview } from "../_components/dashboard-overview";

export const metadata: Metadata = {
  title: "Painel — Gateon",
  description: "Gerencie grupos, membros e integrações.",
};

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <DashboardOverview
      userName={user?.name}
      email={user?.email}
      emailVerified={user?.emailVerified}
    />
  );
}
