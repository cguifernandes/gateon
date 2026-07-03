import { Container } from "@/components/container";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureCardArtSalesGrowth } from "../charts/art-sales-growth";

const comparisons = [
  {
    label: "Liberação de acesso",
    without: "Manual após confirmação",
    with: "Automática via webhook Stripe",
  },
  {
    label: "Remoção por inadimplência",
    without: "Manual ou nunca",
    with: "Automática e imediata",
  },
  {
    label: "Lembretes de renovação",
    without: "Nenhum",
    with: "Automático no timing certo",
  },
  {
    label: "Acompanhamento",
    without: "Planilhas",
    with: "Dashboard em tempo real",
  },
  {
    label: "Escala",
    without: "Limitada ao seu tempo",
    with: "Ilimitada (depende do plano)",
  },
];

export function ComparisonSection() {
  return (
    <section
      className="border-t border-border/60 bg-surface py-16 md:py-20"
      id="comparacao"
    >
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Manual vs <span className="text-primary">Automático</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Veja como o Gateon transforma a operação do seu grupo pago no
            Telegram.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="hidden lg:block" />

          <div className="rounded-xl border border-border bg-card p-4 text-center lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Sem Gateon
            </p>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Com Gateon
            </p>
          </div>

          {comparisons.map((item) => (
            <div key={item.label} className="contents">
              <div className="flex items-center rounded-lg bg-card px-4 py-3 text-sm font-medium text-foreground lg:col-span-1">
                {item.label}
              </div>
              <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground lg:col-span-2">
                {item.without}
              </div>
              <div className="rounded-lg bg-primary/5 px-4 py-3 text-sm font-medium text-primary lg:col-span-2">
                {item.with}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
