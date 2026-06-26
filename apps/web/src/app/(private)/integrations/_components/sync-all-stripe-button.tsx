"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  RefreshCWIcon,
  type RefreshCWIconHandle,
} from "@/components/icons/refresh-cw";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { readErrorBody } from "@/lib/http/read-error-body";
import { cn } from "@/lib/utils";
import {
  type StripeBillingConnectionDto,
  type StripeBillingStatusDto,
  stripeBillingStatusSchema,
} from "@/lib/zod/stripe-billing-schemas";

type SyncAllStripeButtonProps = {
  connections: StripeBillingConnectionDto[];
  onStatusChange: (status: StripeBillingStatusDto) => void;
  onSyncingChange?: (isSyncing: boolean) => void;
  disabled?: boolean;
};

export function SyncAllStripeButton({
  connections,
  onStatusChange,
  onSyncingChange,
  disabled = false,
}: SyncAllStripeButtonProps) {
  const refreshIconRef = useRef<RefreshCWIconHandle>(null);
  const [isPending, setIsPending] = useState(false);
  const isDisabled = disabled || isPending || connections.length === 0;

  async function syncAll() {
    setIsPending(true);
    onSyncingChange?.(true);

    try {
      for (const connection of connections) {
        const response = await fetch(
          `/api/stripe-billing/${connection.id}/sync`,
          { method: "POST" },
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            readErrorBody(body, "Não foi possível concluir a sincronização."),
          );
        }

        const parsed = stripeBillingStatusSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error("A resposta da API veio em formato inválido.");
        }

        onStatusChange(parsed.data);
      }

      toast.success("Sincronização concluída", {
        description: "Todos os planos foram atualizados.",
      });
    } catch (error) {
      toast.error("Falha ao sincronizar", {
        description:
          error instanceof Error
            ? error.message
            : "Tente novamente em instantes.",
      });
    } finally {
      setIsPending(false);
      onSyncingChange?.(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(triggerProps) => (
          <Button
            {...triggerProps}
            type="button"
            variant="outline"
            size="icon"
            className={cn("size-[40px] shrink-0", triggerProps.className)}
            disabled={isDisabled}
            aria-label={
              isPending ? "Sincronizando integrações" : "Sincronizar todos"
            }
            onClick={(event) => {
              triggerProps.onClick?.(event);
              void syncAll();
            }}
            onMouseEnter={(event) => {
              triggerProps.onMouseEnter?.(event);
              if (!isDisabled) {
                refreshIconRef.current?.startAnimation();
              }
            }}
            onMouseLeave={(event) => {
              triggerProps.onMouseLeave?.(event);
              refreshIconRef.current?.stopAnimation();
            }}
          >
            <RefreshCWIcon
              ref={refreshIconRef}
              size={16}
              isAnimateOnView={false}
              className={cn(isPending && "animate-spin")}
            />
          </Button>
        )}
      />
      <TooltipContent sideOffset={8} side="bottom">
        {isPending
          ? "Sincronizando todas as integrações…"
          : "Sincronizar todos"}
      </TooltipContent>
    </Tooltip>
  );
}
