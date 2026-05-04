import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "../container";

const blocks = [
  {
    title: "Validação de membros",
    desc: "Sincronize pagamento aprovado com convite e role no grupo, sem aprovação manual.",
    visual: "telegram" as const,
  },
  {
    title: "Expulsão automática",
    desc: "Falta de pagamento ou chargeback? O acesso é revogado e o membro notificado.",
    visual: "remove" as const,
  },
  {
    title: "Lembretes inteligentes",
    desc: "Cobranças antes do vencimento e pós-tentativas, no timing certo no Telegram.",
    visual: "phone" as const,
  },
  {
    title: "Dashboard analítico",
    desc: "Volume, MRR, churn e engajamento em painéis prontos para agir hoje.",
    visual: "chart" as const,
  },
];

function MiniVisual({ type }: { type: (typeof blocks)[number]["visual"] }) {
  if (type === "telegram") {
    return (
      <div className="mt-3 rounded-lg border border-border bg-muted/50 p-2 text-left text-[10px] text-muted-foreground">
        <div className="mb-1 font-medium text-foreground">Grupo · VIP</div>
        <div className="flex gap-1">
          <div className="h-4 w-4 shrink-0 rounded-full bg-primary/30" />
          <div className="space-y-0.5">
            <div className="h-0.5 w-24 bg-muted" />
            <div className="h-0.5 w-16 bg-muted" />
          </div>
        </div>
        <div className="mt-1 rounded bg-green-100 px-1.5 py-0.5 text-[9px] text-green-800">
          Acesso OK
        </div>
      </div>
    );
  }
  if (type === "remove") {
    return (
      <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-left text-[10px] text-destructive">
        <div className="font-semibold">Membro removido</div>
        <div className="text-destructive/90">Assinatura inativa</div>
      </div>
    );
  }
  if (type === "phone") {
    return (
      <div className="mt-3 flex justify-center">
        <div className="h-20 w-12 rounded border border-border bg-surface-container-highest/80 p-1 shadow-inner">
          <div className="h-1.5 w-full rounded-sm bg-muted" />
          <div className="mt-1 rounded bg-amber-100 p-0.5 text-[7px] text-amber-900">
            Lembrete: renovação
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-left text-[9px]">
      <div className="rounded border border-border p-1.5">
        <div className="text-muted-foreground">Volume</div>
        <div className="font-bold text-foreground">R$ 18k</div>
        <div className="mt-0.5 h-3 w-full overflow-hidden bg-primary/20">
          <div className="h-full w-2/3 bg-primary/60" />
        </div>
      </div>
      <div className="rounded border border-border p-1.5">
        <div className="text-muted-foreground">Churn</div>
        <div className="font-bold text-foreground">1,2%</div>
        <div className="mt-0.5 flex h-3 items-end gap-px">
          {[30, 50, 40, 70, 45].map((h) => (
            <div
              key={h}
              className="w-1 bg-primary/50"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ManagementSection() {
  return (
    <section className="py-16 md:py-20" id="gerenciamento">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tudo o que você precisa para gerenciar{" "}
            <span className="text-primary">um grupo pago.</span>
          </h2>
          <p className="mt-2 text-muted-foreground">
            Operação do grupo alinhada ao ciclo de cobrança — sem atalhos
            manuais.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {blocks.map((b) => (
            <Card
              key={b.title}
              className="border-slate-200/80 bg-surface-container-low"
            >
              <CardHeader>
                <CardTitle className="text-lg">{b.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">
                {b.desc}
                <MiniVisual type={b.visual} />
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
