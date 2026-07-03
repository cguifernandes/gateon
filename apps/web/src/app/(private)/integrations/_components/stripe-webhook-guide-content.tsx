import { cn } from "@/lib/utils";

/** Keep in sync with StripeBillingWebhookService.processEvent (apps/api). */
const stripeWebhookEventsToSelect = [
  {
    type: "customer.subscription.created",
    label: "Assinatura criada",
  },
  {
    type: "customer.subscription.updated",
    label: "Assinatura atualizada (renovação, cancelamento agendado, etc.)",
  },
  {
    type: "customer.subscription.deleted",
    label: "Assinatura encerrada",
  },
  {
    type: "invoice.paid",
    label: "Fatura paga",
  },
  {
    type: "invoice.payment_failed",
    label: "Pagamento da fatura falhou",
  },
  {
    type: "invoice.voided",
    label: "Fatura anulada",
  },
  {
    type: "checkout.session.completed",
    label: "Checkout concluído (vínculo Telegram após pagamento pelo bot)",
  },
] as const;

const webhookEffects = [
  "Atualiza assinaturas e métricas no painel sem clicar em Sincronizar",
  "Dispara alertas de pagamento, cancelamento e vencimento em tempo real",
  "Finaliza o vínculo assinante ↔ Telegram após checkout pelo bot",
];

type StripeWebhookGuideContentProps = {
  className?: string;
  /** When true, emphasizes that the endpoint URL appears after connecting. */
  showPostConnectNote?: boolean;
};

export function StripeWebhookGuideContent({
  className,
  showPostConnectNote = false,
}: StripeWebhookGuideContentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <section className="space-y-2 rounded-xl border border-border p-4">
        <p className="font-heading font-medium text-foreground text-sm">
          Como a integração funciona
        </p>
        <ol className="list-decimal space-y-2 pl-4 text-muted-foreground text-xs leading-relaxed">
          <li>
            <span className="font-medium text-foreground">Chave de API</span>{" "}
            (já conectada): o Gateon{" "}
            <span className="font-medium text-foreground">consulta</span> a
            Stripe quando você sincroniza — clientes, assinaturas e faturas
            entram no painel.
          </li>
          <li>
            <span className="font-medium text-foreground">Webhook</span>{" "}
            (configure abaixo): a Stripe{" "}
            <span className="font-medium text-foreground">
              avisa o Gateon na hora
            </span>{" "}
            quando um evento acontece. Sem isso, alertas automáticos só disparam
            na sincronização manual.
          </li>
        </ol>
      </section>

      <section className="space-y-2 rounded-xl border border-border p-4">
        <p className="font-heading font-medium text-foreground text-sm">
          O que o webhook faz no Gateon
        </p>
        <ul className="space-y-1.5 text-muted-foreground text-xs leading-relaxed">
          {webhookEffects.map((effect) => (
            <li key={effect} className="flex gap-2">
              <span className="text-primary" aria-hidden>
                •
              </span>
              <span>{effect}</span>
            </li>
          ))}
        </ul>
        <p className="pt-1 text-muted-foreground text-xs leading-relaxed">
          Cada evento Stripe dispara no máximo uma rodada de alertas no Gateon.
          Eventos repetidos (retentativas da Stripe) e combinações como sync +
          webhook para o mesmo pagamento ou cancelamento não geram mensagens
          duplicadas.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-border p-4">
        <p className="font-heading font-medium text-foreground text-sm">
          Como configurar na Stripe
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Cada plano conectado no Gateon tem uma URL de webhook exclusiva. Siga
          o passo a passo e marque{" "}
          <span className="font-medium text-foreground">
            todos os eventos listados abaixo
          </span>{" "}
          — sem eles, parte dos alertas e do vínculo pelo bot não funciona em
          tempo real.
        </p>

        <ol className="list-decimal space-y-2.5 pl-4 text-muted-foreground text-xs leading-relaxed">
          <li>
            {showPostConnectNote ? (
              <>
                Conclua esta integração. No card da Stripe em Integrações, abra{" "}
                <span className="font-medium text-foreground">
                  Alertas em tempo real
                </span>{" "}
                e copie a{" "}
                <span className="font-medium text-foreground">
                  URL do endpoint
                </span>
                .
              </>
            ) : (
              <>
                Neste card, copie a{" "}
                <span className="font-medium text-foreground">
                  URL do endpoint
                </span>{" "}
                exibida em &quot;Alertas em tempo real&quot;.
              </>
            )}
          </li>
          <li>
            Acesse{" "}
            <a
              href="https://dashboard.stripe.com/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Desenvolvedores → Webhooks
            </a>{" "}
            no painel da Stripe e clique em{" "}
            <span className="font-medium text-foreground">
              Adicionar destino
            </span>{" "}
            (ou &quot;Add endpoint&quot;).
          </li>
          <li>
            Cole a URL do Gateon em{" "}
            <span className="font-medium text-foreground">URL do endpoint</span>
            .
          </li>
          <li>
            Em{" "}
            <span className="font-medium text-foreground">
              Selecionar eventos
            </span>
            , escolha{" "}
            <span className="font-medium text-foreground">
              Selecionar eventos específicos
            </span>{" "}
            e marque exatamente estes (use a busca da Stripe pelo nome técnico):
            <ul className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
              {stripeWebhookEventsToSelect.map((event) => (
                <li
                  key={event.type}
                  className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2"
                >
                  <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                    {event.type}
                  </code>
                  <span className="text-muted-foreground">{event.label}</span>
                </li>
              ))}
            </ul>
          </li>
          <li>
            Salve o endpoint. Na página do webhook criado, revele o{" "}
            <span className="font-medium text-foreground">Signing secret</span>{" "}
            (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              whsec_...
            </code>
            ).
          </li>
          <li>
            Cole o signing secret no campo abaixo e clique em{" "}
            <span className="font-medium text-foreground">Ativar</span>. O badge
            passará para &quot;Webhook ativo&quot; quando a validação estiver
            correta.
          </li>
        </ol>

        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Dica: não use &quot;Receber todos os eventos&quot; — selecione só os
          listados acima. Se adicionar outro plano no Gateon, repita o processo
          com a URL exclusiva daquele plano.
        </p>
      </section>
    </div>
  );
}
