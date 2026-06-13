import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";
import type { StripeBillingStatusDto } from "@/lib/zod/stripe-billing-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { DashboardFiltersProvider } from "./dashboard-filters-context";
import {
  DashboardConnectedBotsCard,
  DashboardGroupInsights,
  DashboardGroupMemberActivityTable,
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
};

export function DashboardOverview({
  groups,
  alertStats,
  alerts,
  stripeBilling,
}: DashboardOverviewProps) {
  const deliveryRateRounded = Math.round(alertStats.deliveryRate);

  return (
    <div className="min-w-0 space-y-6 pb-8 sm:space-y-10 sm:pb-10">
      <DashboardFiltersProvider initialGroupId={groups[0]?.id ?? ""}>
        <DashboardGroupInsights
          groups={groups}
          alerts={alerts}
          globalDeliveryRate={deliveryRateRounded}
        />

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22.5rem]">
          <section className="flex min-w-0 flex-col space-y-4 sm:space-y-6">
            <div className="flex min-h-[min(16rem,42vh)] flex-col sm:min-h-0 sm:max-h-[min(26rem,60vh)]">
              <DashboardGroupMemberActivityTable groups={groups} />
            </div>
            <DashboardStripeBillingTable stripeBilling={stripeBilling} />
          </section>

          <section className="flex min-w-0 flex-col space-y-4 sm:space-y-6">
            <DashboardRecentAlertsCard groups={groups} alerts={alerts} />
            <DashboardConnectedBotsCard groups={groups} />
          </section>
        </div>
      </DashboardFiltersProvider>
    </div>
  );
}
