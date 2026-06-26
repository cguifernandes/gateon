import type { Metadata } from "next";
import { getAlerts } from "@/lib/server/data/get-alerts";
import { getSessionUser } from "@/lib/server/data/get-session";
import { getStripeBillingStatus } from "@/lib/server/data/get-stripe-billing-status";
import { getTelegramGroupsForMembers } from "@/lib/server/data/get-telegram-groups-for-members";
import { DashboardOverview } from "./_components/dashboard-overview";

export const metadata: Metadata = {
  title: "Painel — Gateon",
  description: "Gerencie grupos, membros e integrações.",
};

export default async function DashboardPage() {
  const [user, { groups }, { data: alertsData }, { data: stripeBilling }] =
    await Promise.all([
      getSessionUser(),
      getTelegramGroupsForMembers({
        all: true,
        includeMemberStripePlans: false,
      }),
      getAlerts({ pageSize: 5 }),
      getStripeBillingStatus(),
    ]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <DashboardOverview
        userName={user?.name}
        email={user?.email}
        emailVerified={user?.emailVerified}
        groups={groups}
        alertStats={alertsData.stats}
        alerts={alertsData.alerts}
        stripeBilling={stripeBilling}
      />
    </div>
  );
}
