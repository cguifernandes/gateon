import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CancelCommandSettingsCard() {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Comando /cancelar</CardTitle>
          <Badge variant="secondary">Sempre ativo</Badge>
        </div>
        <CardDescription>
          Assinantes podem cancelar ou gerenciar o plano direto na Stripe pelo
          bot, sem depender de mensagem personalizada no /start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="font-medium text-foreground">Como funciona</p>
          <ol className="mt-2 list-decimal space-y-2 pl-4 text-muted-foreground leading-relaxed">
            <li>
              O assinante envia <span className="font-mono">/cancelar</span> no
              chat privado com o bot do Gateon.
            </li>
            <li>
              O bot lista cada assinatura ainda gerenciável na Stripe que foi
              vinculada a este Telegram após o checkout —{" "}
              <span className="font-medium text-foreground">
                não depende dos botões atuais do /start
              </span>
              . Remover um plano das opções de assinar não impede o
              cancelamento de quem já pagou.
            </li>
            <li>
              Cada botão abre o{" "}
              <span className="font-medium text-foreground">
                Customer Portal
              </span>{" "}
              da Stripe (somente com integração conectada e portal habilitado
              na conta Stripe).
            </li>
            <li>
              Se o assinante cancelou e assinou de novo pelo bot, o Gateon
              reativa o vínculo após o checkout ou na próxima sincronização
              Stripe.
            </li>
          </ol>
        </div>

        <p className="font-medium text-foreground">
          O que você precisa na Stripe
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Em{" "}
          <span className="font-medium text-foreground">
            Settings → Billing → Customer portal
          </span>
          , ative o portal e permita cancelamento de assinaturas. Sem isso, o
          comando /cancelar retorna erro para o assinante.
        </p>

        <p className="text-muted-foreground text-xs leading-relaxed">
          O /help do bot já menciona este comando. Não é necessário ativar nada
          extra no painel — o fluxo usa a integração Stripe conectada em{" "}
          <Link
            href="/integrations"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Integrações
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
