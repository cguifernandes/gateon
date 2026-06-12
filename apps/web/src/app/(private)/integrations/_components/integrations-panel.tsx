"use client";

import { useRef, useState } from "react";
import { PlusIcon, type PlusIconHandle } from "@/components/icons/plus";
import { Button } from "@/components/ui/button";
import type { StripeBillingStatusDto } from "@/lib/zod/stripe-billing-schemas";
import { ConnectIntegrationDialog } from "./connect-integration-dialog";
import { IntegrationsEmptyState } from "./integrations-empty-state";
import { StripeConnectedCard } from "./stripe-connected-card";

type IntegrationsPanelProps = {
  stripeStatus: StripeBillingStatusDto;
  onStripeStatusChange: (status: StripeBillingStatusDto) => void;
};

export function IntegrationsPanel({
  stripeStatus,
  onStripeStatusChange,
}: IntegrationsPanelProps) {
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
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
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {stripeStatus.canConnect ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => setConnectDialogOpen(true)}
            onMouseEnter={() => plusIconRef.current?.startAnimation()}
            onMouseLeave={() => plusIconRef.current?.stopAnimation()}
          >
            <PlusIcon ref={plusIconRef} size={14} isAnimateOnView={false} />
            Adicionar integração
          </Button>
        </div>
      ) : null}

      <StripeConnectedCard
        connections={stripeStatus.connections}
        onStatusChange={onStripeStatusChange}
      />

      <ConnectIntegrationDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        connectedPriceIds={connectedPriceIds}
        onStripeConnected={onStripeStatusChange}
      />
    </div>
  );
}
