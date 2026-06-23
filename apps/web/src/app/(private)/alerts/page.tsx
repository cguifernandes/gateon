import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderPage } from "@/components/loader-page";
import { getAlerts } from "@/lib/server/get-alerts";
import { getStripeBillingConnectionOptions } from "@/lib/server/get-stripe-billing-connection-options";
import { getTelegramGroupOptions } from "@/lib/server/get-telegram-group-options";
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
    <div className="flex flex-col gap-6 pb-10">
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

      <Suspense fallback={<LoaderPage />}>
        <AlertsClient
          initialData={data}
          groups={groups}
          stripeConnections={stripeConnections}
        />
      </Suspense>
    </div>
  );
}
