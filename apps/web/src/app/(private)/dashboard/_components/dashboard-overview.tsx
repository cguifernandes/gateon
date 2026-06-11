import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { DashboardFiltersProvider } from "./dashboard-filters-context";
import {
  DashboardGroupInsights,
  DashboardGroupMemberActivityTable,
  DashboardRecentAlertsCard,
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
};

export function DashboardOverview({
  groups,
  alertStats,
  alerts,
}: DashboardOverviewProps) {
  const deliveryRateRounded = Math.round(alertStats.deliveryRate);

  return (
    <div className="space-y-6 pb-10">
      <DashboardFiltersProvider initialGroupId={groups[0]?.id ?? ""}>
        <DashboardGroupInsights
          groups={groups}
          alerts={alerts}
          globalDeliveryRate={deliveryRateRounded}
        />

        <section className="flex max-h-[min(26rem,60vh)] min-h-0 flex-col gap-8 xl:flex-row xl:items-stretch">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <DashboardGroupMemberActivityTable groups={groups} />
          </div>
          <div className="flex min-h-0 w-full shrink-0 flex-col xl:w-[320px]">
            <DashboardRecentAlertsCard groups={groups} alerts={alerts} />
          </div>
        </section>
      </DashboardFiltersProvider>
    </div>
  );
}
