import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AlertSummaryDto } from "@/lib/zod/alert-schemas";
import type { StripeBillingStatusDto } from "@/lib/zod/stripe-billing-schemas";
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
    <div className="space-y-6 pb-10">
      <DashboardFiltersProvider initialGroupId={groups[0]?.id ?? ""}>
        <DashboardGroupInsights
          groups={groups}
          alerts={alerts}
          globalDeliveryRate={deliveryRateRounded}
        />

        <StripeBillingDashboardCard stripeBilling={stripeBilling} />

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

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function StripeBillingDashboardCard({
  stripeBilling,
}: {
  stripeBilling: StripeBillingStatusDto;
}) {
  const totals = stripeBilling.totals;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Billing</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StripeMetric
          label="Assinaturas ativas"
          value={String(totals.activeSubscriptionCount)}
        />
        <StripeMetric
          label="Próximas de vencer"
          value={String(totals.expiringSubscriptionCount)}
        />
        <StripeMetric
          label="Expiradas"
          value={String(totals.expiredSubscriptionCount)}
        />
        <StripeMetric
          label="Receita mensal"
          value={formatCurrency(totals.monthlyRevenueCents)}
        />
        <StripeMetric
          label="Pagamentos recebidos"
          value={String(totals.receivedPaymentCount)}
        />
        <StripeMetric
          label="Falhas de pagamento"
          value={String(totals.failedPaymentCount)}
        />
      </CardContent>
    </Card>
  );
}

function StripeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold text-base">{value}</p>
    </div>
  );
}
