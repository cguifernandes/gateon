"use client";

import Link from "next/link";
import { BotSettingSwitch } from "./bot-setting-switch";

type BotAccessAutomationSwitchProps = {
  value: boolean;
  onChange: (checked: boolean) => void;
};

export function BotAccessAutomationSwitch({
  value,
  onChange,
}: BotAccessAutomationSwitchProps) {
  return (
    <BotSettingSwitch
      checked={value}
      onCheckedChange={onChange}
      title="Remover automaticamente ao expirar"
      description="O bot remove o membro quando a assinatura termina de fato na Stripe (cancelada ou inadimplente). Cancelamentos agendados mantêm o acesso até o fim do período."
      tooltip="Só afeta membros vinculados ao checkout do bot. O bot precisa ser administrador com permissão para remover membros."
    >
      <p className="text-muted-foreground text-xs leading-relaxed">
        Para a remoção acontecer assim que a Stripe atualizar o status, configure
        o webhook em{" "}
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
  );
}
