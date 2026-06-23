"use client";

import Link from "next/link";
import { LockIcon } from "@/components/icons/lock";
import { buttonVariants } from "@/components/ui/button";
import { PLAN_LABELS } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";
import type { TelegramBotStartSettingsResponseDto } from "@/lib/zod/bot-start-settings-schemas";
import { BotSettingSwitch } from "./bot-setting-switch";

const UPGRADE_PLAN_ID = "starter";

type BotAccessAutomationSwitchProps = {
  settings: TelegramBotStartSettingsResponseDto;
  value: boolean;
  onChange: (checked: boolean) => void;
};

export function BotAccessAutomationSwitch({
  settings,
  value,
  onChange,
}: BotAccessAutomationSwitchProps) {
  const isLocked = !settings.canUsePaidAutomation;

  function handleToggle(checked: boolean) {
    if (isLocked) {
      return;
    }
    onChange(checked);
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
          checked={value}
          disabled={isLocked}
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
