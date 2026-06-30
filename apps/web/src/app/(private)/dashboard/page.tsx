import type { Metadata } from "next";
import { PrivacyConsentBanner } from "@/components/privacy-consent-banner";
import { getAlerts } from "@/lib/server/data/get-alerts";
import { getSessionUser } from "@/lib/server/data/get-session";
import { getStripeBillingStatus } from "@/lib/server/data/get-stripe-billing-status";
import { getTelegramGroupsForMembers } from "@/lib/server/data/get-telegram-groups-for-members";
import { getBillingPlans, getNextPlan } from "@/lib/server/data/get-billing-plans";
import { DashboardOverview } from "./_components/dashboard-overview";

export const metadata: Metadata = {
  title: "Painel — Gateon",
  description: "Gerencie grupos, membros e integrações.",
};

export default async function DashboardPage() {
  const [user, { groups }, { data: alertsData }, { data: stripeBilling }, billingPlans] =
    await Promise.all([
      getSessionUser(),
      getTelegramGroupsForMembers({
        all: true,
        includeMemberStripePlans: false,
      }),
      getAlerts({ pageSize: 5 }),
      getStripeBillingStatus(),
      getBillingPlans(),
    ]);

  const nextPlan = user ? getNextPlan(user.planId, billingPlans) : null;

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
        nextPlan={nextPlan}
        planId={user?.planId ?? "free"}
      />
      <PrivacyConsentBanner />
    </div>
  );
}
