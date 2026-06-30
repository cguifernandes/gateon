import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";
import type { StripeBillingStatusDto } from "@/lib/zod/stripe-billing-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import type { AvailablePlan } from "@/lib/server/data/get-billing-plans";
import type { PlanId } from "@/lib/zod/plan-schemas";
import { DashboardFiltersProvider } from "./dashboard-filters-context";
import {
  DashboardConnectedBotsCard,
  DashboardGroupInsights,
  DashboardGroupMemberActivityTable,
  DashboardPlanUpsellCard,
  DashboardRecentAlertsCard,
  DashboardStripeBillingTable,
} from "./dashboard-widgets";

type AlertStats = {
  activeCount: number;
  sentToday: number;
  deliveryRate: number;
  draftCount: number;
};

export type DashboardOverviewProps = {
  userName?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  groups: TelegramGroupSummaryDto[];
  alertStats: AlertStats;
  alerts: AlertSummaryDto[];
  stripeBilling: StripeBillingStatusDto;
  nextPlan?: AvailablePlan | null;
  planId?: PlanId;
};

export function DashboardOverview({
  groups,
  alertStats,
  alerts,
  stripeBilling,
  nextPlan,
  planId = "free",
}: DashboardOverviewProps) {
  const deliveryRateRounded = Math.round(alertStats.deliveryRate);

  return (
    <div className="min-w-0 space-y-6 pb-10 sm:space-y-10">
      <DashboardFiltersProvider initialGroupId={groups[0]?.id ?? ""}>
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
          <section className="flex min-w-0 flex-col space-y-4 sm:space-y-6">
            <DashboardGroupInsights
              groups={groups}
              alerts={alerts}
              globalDeliveryRate={deliveryRateRounded}
            />

            <div className="flex min-h-[min(16rem,42vh)] flex-col sm:min-h-0 sm:max-h-[min(26rem,60vh)]">
              <DashboardGroupMemberActivityTable groups={groups} />
            </div>

            <DashboardStripeBillingTable stripeBilling={stripeBilling} />
          </section>

          <section className="flex min-w-0 flex-col space-y-4 sm:space-y-6">
            <DashboardPlanUpsellCard nextPlan={nextPlan} planId={planId} />
            <DashboardRecentAlertsCard groups={groups} alerts={alerts} />
            <DashboardConnectedBotsCard groups={groups} />
          </section>
        </div>
      </DashboardFiltersProvider>
    </div>
  );
}
