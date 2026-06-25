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
              .
            </li>
            <li>
              Cada botão abre o{" "}
              <span className="font-medium text-foreground">
                Customer Portal
              </span>{" "}
              da Stripe (integração conectada + portal habilitado na conta
              Stripe).
            </li>
          </ol>
        </div>

        <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-medium text-foreground">
            Cancelou, mas ainda está no grupo?
          </p>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Na Stripe, o cancelamento costuma ser{" "}
            <span className="font-medium text-foreground">
              ao fim do período já pago
            </span>
            . Até lá a assinatura continua{" "}
            <span className="font-medium text-foreground">ativa</span> e o
            membro permanece no grupo — o Gateon não remove antes da expiração
            real.
          </p>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Nesses casos, em{" "}
            <Link
              href="/members"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Membros
            </Link>{" "}
            e{" "}
            <Link
              href="/groups"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Grupos
            </Link>{" "}
            o membro mantém o badge{" "}
            <span className="font-medium text-foreground">Stripe</span> (ainda é
            pagante) e ganha o badge{" "}
            <span className="font-medium text-foreground">Cancelou</span>{" "}
            (cancelamento agendado). Use o filtro{" "}
            <span className="font-medium text-foreground">
              Cancelamento agendado
            </span>{" "}
            para listar quem está nessa situação.
          </p>
        </div>

        <p className="font-medium text-foreground">
          O que você precisa na Stripe
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Em{" "}
          <span className="font-medium text-foreground">
            Settings → Billing → Customer portal
          </span>
          , ative o portal e permita cancelamento de assinaturas.
        </p>
      </CardContent>
    </Card>
  );
}
