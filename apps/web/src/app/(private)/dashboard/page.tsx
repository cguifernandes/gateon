import type { Metadata } from "next";
import { getAlerts } from "@/lib/server/get-alerts";
import { getSessionUser } from "@/lib/server/get-session";
import { getStripeBillingStatus } from "@/lib/server/get-stripe-billing-status";
import { getTelegramGroupsForMembers } from "@/lib/server/get-telegram-groups-for-members";
import { DashboardOverview } from "./_components/dashboard-overview";

export const metadata: Metadata = {
  title: "Painel — Gateon",
  description: "Gerencie grupos, membros e integrações.",
};

export default async function DashboardPage() {
  const [user, { groups }, { data: alertsData }, { data: stripeBilling }] =
    await Promise.all([
      getSessionUser(),
      getTelegramGroupsForMembers(),
      getAlerts(),
      getStripeBillingStatus(),
    ]);

  return (
    <DashboardOverview
      userName={user?.name}
      email={user?.email}
      emailVerified={user?.emailVerified}
      groups={groups}
      alertStats={alertsData.stats}
      alerts={alertsData.alerts}
      stripeBilling={stripeBilling}
    />
  );
}
