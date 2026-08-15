import type { Metadata } from "next";
import { getAlerts } from "@/lib/server/data/get-alerts";
import { getStripeBillingConnectionOptions } from "@/lib/server/data/get-stripe-billing-connection-options";
import { getTelegramGroupOptions } from "@/lib/server/data/get-telegram-group-options";
import { AlertsClient } from "./_components/alerts-client";

export const metadata: Metadata = {
  title: "Central de Alertas — Gateon",
  description:
    "Crie avisos automáticos e campanhas administrativas para Telegram.",
};

export default async function AlertsPage() {
  const [
    { data, error },
    { groups, error: groupsError },
    { connections: stripeConnections, error: stripeError },
  ] = await Promise.all([
    getAlerts(),
    getTelegramGroupOptions(),
    getStripeBillingConnectionOptions(),
  ]);

  return (
    <div className="flex flex-col gap-6 pt-4 pb-10">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : null}

      {groupsError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-600 text-sm">
          {groupsError}
        </div>
      ) : null}

      {stripeError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-600 text-sm">
          {stripeError}
        </div>
      ) : null}

      <AlertsClient
        initialData={data}
        groups={groups}
        stripeConnections={stripeConnections}
      />
    </div>
  );
}
