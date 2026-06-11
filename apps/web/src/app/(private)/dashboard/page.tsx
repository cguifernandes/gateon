import type { Metadata } from "next";
import { getAlerts } from "@/lib/server/get-alerts";
import { getSessionUser } from "@/lib/server/get-session";
import { getTelegramGroupsForMembers } from "@/lib/server/get-telegram-groups-for-members";
import { DashboardOverview } from "./_components/dashboard-overview";

export const metadata: Metadata = {
  title: "Painel — Gateon",
  description: "Gerencie grupos, membros e integrações.",
};

export default async function DashboardPage() {
  const [user, { groups }, { data: alertsData }] = await Promise.all([
    getSessionUser(),
    getTelegramGroupsForMembers(),
    getAlerts(),
  ]);

  return (
    <DashboardOverview
      userName={user?.name}
      email={user?.email}
      emailVerified={user?.emailVerified}
      groups={groups}
      alertStats={alertsData.stats}
      alerts={alertsData.alerts}
    />
  );
}
