"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CancelCommandSettingsCard() {
  return (
    <Card className="rounded-xl">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Comando /cancelar</CardTitle>
          <Badge variant="default">Sempre ativo</Badge>
        </div>
        <CardDescription>
          Assinantes podem cancelar ou gerenciar o plano direto na Stripe pelo
          bot, sem depender de mensagem personalizada no /start.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Accordion className="gap-2">
          <AccordionItem value="how-it-works">
            <AccordionTrigger className="font-medium text-foreground">
              Como funciona
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal space-y-2 pl-4 text-muted-foreground leading-relaxed">
                <li>
                  O assinante envia <span className="font-mono">/cancelar</span>{" "}
                  no chat privado com o bot do Gateon.
                </li>
                <li>
                  O bot lista cada assinatura ainda gerenciável na Stripe que
                  foi vinculada a este Telegram após o checkout —{" "}
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
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="scheduled-cancel">
            <AccordionTrigger className="font-medium text-foreground">
              Cancelou, mas ainda está no grupo?
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground leading-relaxed">
                Na Stripe, o cancelamento costuma ser{" "}
                <span className="font-medium text-foreground">
                  ao fim do período já pago
                </span>
                . Até lá a assinatura continua{" "}
                <span className="font-medium text-foreground">ativa</span> e o
                membro permanece no grupo — o Gateon não remove antes da
                expiração real.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Nesses casos, em{" "}
                <Link
                  href="/members"
                  className={cn(
                    buttonVariants({ variant: "link" }),
                    "p-0 h-fit",
                  )}
                >
                  Membros
                </Link>{" "}
                e{" "}
                <Link
                  href="/groups"
                  className={cn(
                    buttonVariants({ variant: "link" }),
                    "p-0 h-fit",
                  )}
                >
                  Grupos
                </Link>{" "}
                o membro mantém o badge{" "}
                <span className="font-medium text-foreground">Stripe</span>{" "}
                (ainda é pagante) e ganha o badge{" "}
                <span className="font-medium text-foreground">Cancelou</span>{" "}
                (cancelamento agendado). Use o filtro{" "}
                <span className="font-medium text-foreground">
                  Cancelamento agendado
                </span>{" "}
                para listar quem está nessa situação.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
