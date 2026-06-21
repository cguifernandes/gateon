"use client";

import { useState } from "react";
import { StatCard } from "@/app/(private)/alerts/_components/stat-card";
import { Badge } from "@/components/ui/badge";
import type { StripeBillingStatusDto } from "@/lib/zod/stripe-billing-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { IntegrationStatCard } from "./integration-stat-card";
import { IntegrationsPanel } from "./integrations-panel";
import { StripeTelegramLinkingGuide } from "./stripe-telegram-linking-guide";

type IntegrationsClientProps = {
  initialStatus: StripeBillingStatusDto;
  loadError: string | null;
  groups: TelegramGroupSummaryDto[];
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function IntegrationsClient({
  initialStatus,
  loadError,
  groups,
}: IntegrationsClientProps) {
  const [stripeStatus, setStripeStatus] = useState(initialStatus);
  const totals = stripeStatus.totals;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 bg-linear-to-br from-card via-card to-primary/30 p-6">
          <Badge variant="outline">Integrações</Badge>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading font-extrabold text-3xl leading-[1.08] tracking-tight text-foreground">
              Integrações
            </h1>
            <p className="font-light text-muted-foreground text-sm">
              Conecte gateways de pagamento para monitorar assinaturas e acionar
              automações dentro dos seus grupos.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          key={`subscriptions-${totals.activeSubscriptionCount}`}
          title="Assinaturas monitoradas"
          value={String(totals.activeSubscriptionCount)}
          description="Assinaturas ativas sincronizadas com os gateways conectados."
        />
        <StatCard
          key={`customers-${totals.customerCount}`}
          title="Clientes sincronizados"
          value={String(totals.customerCount)}
          description="Clientes importados dos gateways para automações e alertas."
        />
        <IntegrationStatCard
          title="Receita mensal"
          value={formatCurrency(totals.monthlyRevenueCents)}
          description="Faturas pagas no mês corrente, conforme a sincronização."
        />
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-600 text-sm">
          {loadError}
        </div>
      ) : null}

      <IntegrationsPanel
        stripeStatus={stripeStatus}
        onStripeStatusChange={setStripeStatus}
        groups={groups}
      />

      <StripeTelegramLinkingGuide />
    </>
  );
}
