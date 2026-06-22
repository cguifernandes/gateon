import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const webhookEvents = [
  "Pagamento confirmado ou falhou",
  "Assinatura cancelada, renovada ou próxima do vencimento",
  "Assinatura expirada por inadimplência",
  "Checkout concluído (vínculo Telegram após pagamento)",
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
      <section className={cn("space-y-3 rounded-xl border border-border p-4")}>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <p className="font-heading mb-0! font-medium text-foreground text-sm">
            Por que configurar o webhook?
          </p>
          <Badge variant="outline" className="text-[10px]">
            Recomendado
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          A chave da Stripe permite que o Gateon{" "}
          <span className="font-medium text-foreground">consulte</span> seus
          dados quando você sincroniza. Já o webhook é o canal em que a Stripe{" "}
          <span className="font-medium text-foreground">
            avisa o Gateon na hora
          </span>{" "}
          quando algo acontece — sem precisar clicar em &quot;Sincronizar&quot;.
          Sem webhook, alertas automáticos (pagamento, cancelamento, vencimento)
          só disparam na sincronização manual. Com webhook ativo, eles chegam em
          tempo real ao Telegram.
        </p>
      </section>
      <section className="space-y-2 rounded-xl border border-border p-4">
        <p className="font-heading font-medium text-foreground text-sm">
          O que o webhook faz no Gateon
        </p>
        <ul className="space-y-1.5 text-muted-foreground text-xs leading-relaxed">
          {webhookEvents.map((event) => (
            <li key={event} className="flex gap-2">
              <span className="text-primary" aria-hidden>
                •
              </span>
              <span>{event}</span>
            </li>
          ))}
        </ul>
        <p className="pt-1 text-muted-foreground text-xs leading-relaxed">
          Cada evento atualiza o painel e pode disparar os alertas que você
          configurou na Central de Alertas. Se o assinante estiver vinculado ao
          Telegram, a mensagem vai no privado; caso contrário, no grupo
          vinculado ao plano.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-border p-4">
        <p className="font-heading font-medium text-foreground text-sm">
          Como configurar
        </p>
        <ol className="list-decimal space-y-2 pl-4 text-muted-foreground text-xs leading-relaxed">
          <li>
            {showPostConnectNote ? (
              <>
                Conclua esta integração. Em seguida, no card da Stripe, copie a{" "}
                <span className="font-medium text-foreground">
                  URL do endpoint
                </span>{" "}
                — ela é única para este plano.
              </>
            ) : (
              <>
                No card da integração Stripe, copie a{" "}
                <span className="font-medium text-foreground">
                  URL do endpoint
                </span>{" "}
                exibida na seção &quot;Alertas em tempo real&quot;.
              </>
            )}
          </li>
          <li>
            No{" "}
            <a
              href="https://dashboard.stripe.com/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              painel da Stripe
            </a>
            , crie um endpoint apontando para essa URL. Inclua eventos de
            assinatura, fatura e checkout.
          </li>
          <li>
            Copie o{" "}
            <span className="font-medium text-foreground">signing secret</span>{" "}
            (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
              whsec_...
            </code>
            ) gerado pela Stripe e cole no Gateon.
          </li>
        </ol>
      </section>
    </div>
  );
}
