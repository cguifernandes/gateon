"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { LockIcon } from "@/components/icons/lock";
import { buttonVariants } from "@/components/ui/button";
import { PLAN_LABELS } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";
import {
  type TelegramBotStartSettingsResponseDto,
  telegramBotStartSettingsResponseSchema,
} from "@/lib/zod/bot-start-settings-schemas";
import { BotSettingSwitch } from "./bot-setting-switch";

const UPGRADE_PLAN_ID = "starter";

type BotAccessAutomationSwitchProps = {
  initialSettings: TelegramBotStartSettingsResponseDto;
};

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

export function BotAccessAutomationSwitch({
  initialSettings,
}: BotAccessAutomationSwitchProps) {
  const [settings, setSettings] =
    useState<TelegramBotStartSettingsResponseDto>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const isLocked = !settings.canUsePaidAutomation;

  async function handleToggle(checked: boolean) {
    if (isLocked) {
      return;
    }

    const previous = settings;
    setSettings((current) => ({
      ...current,
      autoRemoveExpiredSubscribers: checked,
    }));
    setIsSaving(true);

    try {
      const response = await fetch("/api/bot-start-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ autoRemoveExpiredSubscribers: checked }),
      });

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            body,
            "Não foi possível salvar a configuração de automação.",
          ),
        );
      }

      const parsed = telegramBotStartSettingsResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error("A API retornou uma resposta inválida.");
      }

      setSettings(parsed.data);
      toast.success(
        checked
          ? "Remoção automática ativada"
          : "Remoção automática desativada",
        {
          description: checked
            ? "Membros serão removidos quando a assinatura for cancelada ou marcada como inadimplente na Stripe."
            : "Nenhuma remoção automática por expiração ou cancelamento.",
        },
      );
    } catch (error) {
      setSettings(previous);
      toast.error("Falha ao salvar", {
        description:
          error instanceof Error
            ? error.message
            : "Tente novamente em instantes.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "transition-[filter,opacity]",
          isLocked && "pointer-events-none select-none blur-[2px]",
        )}
        aria-hidden={isLocked}
      >
        <BotSettingSwitch
          checked={settings.autoRemoveExpiredSubscribers}
          disabled={isSaving || isLocked}
          onCheckedChange={handleToggle}
          title="Remover automaticamente ao expirar"
          description="O bot remove o membro quando a Stripe alterar a assinatura para cancelada ou inadimplente. Não remove no instante em que um pagamento falha."
          tooltip="Só afeta membros vinculados ao checkout do bot. O bot precisa ser administrador com permissão para remover membros."
        >
          <p className="text-muted-foreground text-xs leading-relaxed">
            Para a remoção acontecer assim que a Stripe atualizar o status,
            configure o webhook em{" "}
            <Link
              href="/integrations"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Integrações
            </Link>
            . Sem webhook, a verificação ocorre apenas quando você sincroniza a
            integração Stripe manualmente.
          </p>
        </BotSettingSwitch>
      </div>

      {isLocked ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/55 p-3 backdrop-blur-[1px]">
          <div className="flex max-w-sm flex-col items-center gap-1 text-center">
            <span className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card shadow-sm">
              <LockIcon
                size={16}
                className="text-muted-foreground"
                aria-hidden
              />
            </span>
            <div className="space-y-0.5">
              <p className="font-medium text-foreground text-sm">
                Recurso do plano {PLAN_LABELS[UPGRADE_PLAN_ID]}
              </p>
              <p className="text-muted-foreground text-xs font-light ">
                No plano {settings.planLabel}, a remoção automática fica
                desativada. Faça upgrade para liberar esta automação.
              </p>
            </div>
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ size: "sm" }),
                "pointer-events-auto",
              )}
            >
              Ver planos
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
