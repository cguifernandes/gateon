"use client";

import { useRef, useState } from "react";
import { PlusIcon, type PlusIconHandle } from "@/components/icons/plus";
import { Button } from "@/components/ui/button";
import type { StripeBillingStatusDto } from "@/lib/zod/stripe-billing-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { ConnectIntegrationDialog } from "./connect-integration-dialog";
import { IntegrationsEmptyState } from "./integrations-empty-state";
import { StripeConnectedCard } from "./stripe-connected-card";
import { SyncAllStripeButton } from "./sync-all-stripe-button";

type IntegrationsPanelProps = {
  stripeStatus: StripeBillingStatusDto;
  onStripeStatusChange: (status: StripeBillingStatusDto) => void;
  groups: TelegramGroupSummaryDto[];
};

export function IntegrationsPanel({
  stripeStatus,
  onStripeStatusChange,
  groups,
}: IntegrationsPanelProps) {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const plusIconRef = useRef<PlusIconHandle | null>(null);
  const connectedPriceIds = stripeStatus.connections
    .map((connection) => connection.monitoredStripePriceId)
    .filter((priceId): priceId is string => Boolean(priceId));

  if (!stripeStatus.connected) {
    return (
      <>
        <IntegrationsEmptyState
          canConnect={stripeStatus.canConnect}
          onConnectClick={() => setConnectDialogOpen(true)}
        />
        <ConnectIntegrationDialog
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
          connectedPriceIds={connectedPriceIds}
          onStripeConnected={onStripeStatusChange}
          stripePaymentGroupLimit={stripeStatus.stripePaymentGroupLimit}
          groups={groups}
          existingConnections={stripeStatus.connections.map((connection) => ({
            id: connection.id,
            telegramGroupId: connection.telegramGroupId,
          }))}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {stripeStatus.canConnect || stripeStatus.connections.length > 0 ? (
        <div className="flex justify-end gap-2">
          {stripeStatus.connections.length > 0 ? (
            <SyncAllStripeButton
              connections={stripeStatus.connections}
              onStatusChange={onStripeStatusChange}
              onSyncingChange={setIsSyncingAll}
            />
          ) : null}
          {stripeStatus.canConnect ? (
            <Button
              type="button"
              onClick={() => setConnectDialogOpen(true)}
              onMouseEnter={() => plusIconRef.current?.startAnimation()}
              onMouseLeave={() => plusIconRef.current?.stopAnimation()}
            >
              <PlusIcon ref={plusIconRef} size={14} isAnimateOnView={false} />
              Criar Nova Integração
            </Button>
          ) : null}
        </div>
      ) : null}

      <StripeConnectedCard
        connections={stripeStatus.connections}
        onStatusChange={onStripeStatusChange}
        groups={groups}
        isSyncingAll={isSyncingAll}
      />

      <ConnectIntegrationDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        connectedPriceIds={connectedPriceIds}
        onStripeConnected={onStripeStatusChange}
        stripePaymentGroupLimit={stripeStatus.stripePaymentGroupLimit}
        groups={groups}
        existingConnections={stripeStatus.connections.map((connection) => ({
          id: connection.id,
          telegramGroupId: connection.telegramGroupId,
        }))}
      />
    </div>
  );
}
