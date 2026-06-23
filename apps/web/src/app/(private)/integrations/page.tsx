import type { Metadata } from "next";
import { getStripeBillingStatus } from "@/lib/server/get-stripe-billing-status";
import { getTelegramGroups } from "@/lib/server/get-telegram-groups";
import { IntegrationsClient } from "./_components/integrations-client";

export const metadata: Metadata = {
  title: "Integrações — Gateon",
  description: "Conecte provedores externos ao Gateon.",
};

export default async function IntegrationsPage() {
  const [{ data, error }, { groups, error: groupsError }] = await Promise.all([
    getStripeBillingStatus(),
    getTelegramGroups({ all: true }),
  ]);

  return (
    <div className="space-y-6 pb-10">
      <IntegrationsClient
        initialStatus={data}
        loadError={error ?? groupsError}
        groups={groups}
      />
    </div>
  );
}
