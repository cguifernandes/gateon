"use client";

import { useRef } from "react";
import { PlugIcon } from "@/components/icons/plug";
import { PlusIcon, type PlusIconHandle } from "@/components/icons/plus";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type IntegrationsEmptyStateProps = {
  canConnect: boolean;
  onConnectClick: () => void;
};

export function IntegrationsEmptyState({
  canConnect,
  onConnectClick,
}: IntegrationsEmptyStateProps) {
  const plusIconRef = useRef<PlusIconHandle | null>(null);

  return (
    <Empty className="rounded-xl border border-border">
      <EmptyHeader>
        <EmptyMedia className="size-14 rounded-lg bg-primary/15 ring-1 ring-primary/25">
          <PlugIcon className="text-primary" size={24} aria-hidden />
        </EmptyMedia>
        {canConnect ? (
          <>
            <EmptyTitle>Nenhuma integração conectada</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Conecte um gateway de pagamento para monitorar assinaturas,
              sincronizar clientes e acionar automações nos seus grupos.
            </EmptyDescription>
          </>
        ) : (
          <>
            <EmptyTitle>Conexão indisponível no momento</EmptyTitle>
            <EmptyDescription className="max-w-sm text-pretty">
              Não é possível conectar uma nova integração agora.
            </EmptyDescription>
          </>
        )}
      </EmptyHeader>

      {canConnect ? (
        <EmptyContent>
          <Button
            type="button"
            onClick={onConnectClick}
            onMouseEnter={() => plusIconRef.current?.startAnimation()}
            onMouseLeave={() => plusIconRef.current?.stopAnimation()}
          >
            <PlusIcon ref={plusIconRef} size={14} isAnimateOnView={false} />
            Conectar integração
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
