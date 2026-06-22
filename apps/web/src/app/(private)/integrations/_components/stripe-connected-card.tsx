"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import stripeLogo from "@/assets/gateway/stripe-4.svg";
import { TruncatedTextTooltip } from "@/components/truncated-text-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getIntegrationProvider } from "@/lib/integrations-config";
import { cn } from "@/lib/utils";
import {
  type StripeBillingConnectionDto,
  type StripeBillingStatusDto,
  stripeBillingStatusSchema,
} from "@/lib/zod/stripe-billing-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";
import { StripeWebhookSetup } from "./stripe-webhook-setup";

type StripeConnectedCardProps = {
  connections: StripeBillingConnectionDto[];
  onStatusChange: (status: StripeBillingStatusDto) => void;
  groups: TelegramGroupSummaryDto[];
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatReviewValue(value: string | undefined | null): string {
  if (!value?.trim()) return "—";
  return value;
}

type ReviewSummaryCellProps = {
  label: string;
  value: string;
  className?: string;
  lineClamp?: 2 | 3;
  valueClassName?: string;
};

function ReviewSummaryCell({
  label,
  value,
  className,
  lineClamp,
  valueClassName,
}: ReviewSummaryCellProps) {
  const valueTextClassName = cn(
    "mt-1 font-medium text-sm wrap-break-word",
    valueClassName,
  );

  return (
    <div className={cn("p-3", className)}>
      <p className="text-muted-foreground text-heading text-xs">{label}</p>
      {lineClamp ? (
        <TruncatedTextTooltip
          text={value}
          variant="line-clamp"
          lineClamp={lineClamp}
          className={valueTextClassName}
        />
      ) : (
        <p className={valueTextClassName}>{value}</p>
      )}
    </div>
  );
}

function ReviewSummaryGrid({
  fields,
}: {
  fields: {
    label: string;
    value: string;
    lineClamp?: 2 | 3;
    valueClassName?: string;
  }[];
}) {
  return (
    <div className="grid overflow-hidden rounded-lg border border-border sm:grid-cols-2">
      {fields.map((field, index) => {
        const isLastOddCell =
          fields.length % 2 === 1 && index === fields.length - 1;
        const isLeftCol = index % 2 === 0;
        const rowIndex = Math.floor(index / 2);
        const totalRows = Math.ceil(fields.length / 2);

        return (
          <ReviewSummaryCell
            key={field.label}
            label={field.label}
            value={field.value}
            lineClamp={field.lineClamp}
            valueClassName={field.valueClassName}
            className={cn(
              index < fields.length - 1 && "border-border border-b",
              "sm:border-b-0",
              rowIndex < totalRows - 1 && "sm:border-border sm:border-b",
              isLeftCol && !isLastOddCell && "sm:border-border sm:border-r",
              isLastOddCell && "sm:col-span-2",
            )}
          />
        );
      })}
    </div>
  );
}

function getErrorMessage(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

function buildPlanReviewFields(
  connection: StripeBillingConnectionDto,
  linkedGroup: TelegramGroupSummaryDto | null,
) {
  return [
    {
      label: "Grupo vinculado",
      value: formatReviewValue(linkedGroup?.title?.trim() || "Sem título"),
      lineClamp: 2 as const,
    },
    {
      label: "ID do grupo",
      value: formatReviewValue(linkedGroup?.telegramChatId),
      valueClassName: "font-mono",
    },
    {
      label: "Chave ativa",
      value: `••••${connection.apiKeyLast4}`,
      valueClassName: "font-mono",
    },
    {
      label: "Conta Stripe",
      value: formatReviewValue(connection.stripeAccountId),
      valueClassName: "font-mono",
    },
    {
      label: "Assinaturas ativas",
      value: String(connection.activeSubscriptionCount),
    },
    {
      label: "Próximas de vencer",
      value: String(connection.expiringSubscriptionCount),
    },
    {
      label: "Expiradas",
      value: String(connection.expiredSubscriptionCount),
    },
    {
      label: "Clientes sincronizados",
      value: String(connection.customerCount),
    },
    {
      label: "Receita mensal",
      value: formatCurrency(connection.monthlyRevenueCents),
    },
    {
      label: "Pagamentos recebidos",
      value: String(connection.receivedPaymentCount),
    },
    {
      label: "Falhas de pagamento",
      value: String(connection.failedPaymentCount),
    },
    {
      label: "Última sincronização",
      value: formatDate(connection.lastSyncedAt),
    },
  ];
}

type StripePlanConnectionSectionProps = {
  connection: StripeBillingConnectionDto;
  isLast: boolean;
  isSyncing: boolean;
  isDisconnecting: boolean;
  onSync: () => void;
  onDisconnect: () => void;
  onStatusChange: (status: StripeBillingStatusDto) => void;
  planCount: number;
  groups: TelegramGroupSummaryDto[];
};

function StripePlanConnectionSection({
  connection,
  isLast,
  isSyncing,
  isDisconnecting,
  onSync,
  onDisconnect,
  onStatusChange,
  planCount,
  groups,
}: StripePlanConnectionSectionProps) {
  const planTitle =
    formatReviewValue(connection.monitoredPlanLabel) === "—"
      ? "Plano sem nome"
      : connection.monitoredPlanLabel;

  const linkedGroup = connection.telegramGroupId
    ? (groups.find((group) => group.id === connection.telegramGroupId) ?? null)
    : null;

  return (
    <section
      className={cn("space-y-3 px-5", planCount > 1 && isLast && "pb-5")}
    >
      <h3 className="font-semibold font-heading text-xl leading-tight">
        {planTitle}
      </h3>

      <ReviewSummaryGrid
        fields={buildPlanReviewFields(connection, linkedGroup)}
      />

      <StripeWebhookSetup
        connection={connection}
        onStatusChange={onStatusChange}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          loading={isDisconnecting}
          onClick={onDisconnect}
        >
          Remover plano
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={isSyncing}
          onClick={onSync}
        >
          Sincronizar
        </Button>
      </div>
    </section>
  );
}

export function StripeConnectedCard({
  connections,
  onStatusChange,
  groups,
}: StripeConnectedCardProps) {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const provider = getIntegrationProvider("stripe");
  const gatewayName = provider?.name ?? "Stripe";
  const planCount = connections.length;
  const planCountLabel =
    planCount === 1 ? "1 plano monitorado" : `${planCount} planos monitorados`;

  async function refreshFromResponse(response: Response) {
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        getErrorMessage(body, "Não foi possível concluir a ação."),
      );
    }
    const parsed = stripeBillingStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error("A resposta da API veio em formato inválido.");
    }
    onStatusChange(parsed.data);
  }

  async function syncConnection(connectionId: string) {
    setSyncingId(connectionId);
    try {
      const response = await fetch(`/api/stripe-billing/${connectionId}/sync`, {
        method: "POST",
      });
      await refreshFromResponse(response);
      toast.success("Sincronização concluída", {
        description: "Os dados foram atualizados com sucesso.",
      });
    } catch (error) {
      toast.error("Falha ao sincronizar", {
        description:
          error instanceof Error
            ? error.message
            : "Tente novamente em instantes.",
      });
    } finally {
      setSyncingId(null);
    }
  }

  async function disconnectConnection(connectionId: string) {
    setDisconnectingId(connectionId);
    try {
      const response = await fetch(`/api/stripe-billing/${connectionId}`, {
        method: "DELETE",
      });
      await refreshFromResponse(response);
      toast.success("Plano desconectado");
    } catch (error) {
      toast.error("Falha ao desconectar", {
        description:
          error instanceof Error
            ? error.message
            : "Tente novamente em instantes.",
      });
    } finally {
      setDisconnectingId(null);
    }
  }

  async function syncAll() {
    setSyncingId("all");
    try {
      for (const connection of connections) {
        const response = await fetch(
          `/api/stripe-billing/${connection.id}/sync`,
          { method: "POST" },
        );
        await refreshFromResponse(response);
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
      setSyncingId(null);
    }
  }

  if (connections.length === 0) {
    return null;
  }

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-col gap-3 border-border border-b sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-4">
            <Image
              src={stripeLogo}
              alt={gatewayName}
              className="max-h-7 w-auto object-contain"
            />
          </div>
          <div>
            <CardTitle>{gatewayName}</CardTitle>
            <CardDescription>
              Monitore assinaturas e dispare alertas automaticamente via
              webhook Stripe.
            </CardDescription>
          </div>
        </div>
        <Badge>Conectada</Badge>
      </CardHeader>

      <CardContent className="space-y-5 p-0">
        <div className="flex flex-col gap-1 p-5 pb-0">
          <p className="font-medium font-heading text-muted-foreground text-xs uppercase tracking-wide">
            Detalhes da integração
          </p>
          <h3 className="font-semibold font-heading text-2xl leading-tight">
            {planCountLabel}
          </h3>
        </div>

        {connections.map((connection, index) => (
          <div key={connection.id} className="space-y-4">
            {index > 0 ? <Separator /> : null}
            <StripePlanConnectionSection
              planCount={planCount}
              isLast={index === connections.length - 1}
              connection={connection}
              isSyncing={syncingId === connection.id || syncingId === "all"}
              isDisconnecting={disconnectingId === connection.id}
              onSync={() => syncConnection(connection.id)}
              onDisconnect={() => disconnectConnection(connection.id)}
              onStatusChange={onStatusChange}
              groups={groups}
            />
          </div>
        ))}
      </CardContent>

      {planCount > 1 ? (
        <CardFooter className="border-border border-t">
          <div className="flex w-full justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-40"
              loading={syncingId === "all"}
              onClick={syncAll}
            >
              Sincronizar todos
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
