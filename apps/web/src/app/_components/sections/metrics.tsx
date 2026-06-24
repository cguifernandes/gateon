import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/container";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
const barHeights = [40, 55, 45, 70, 60, 75];

export function MetricsSection() {
  return (
    <section className="border-t border-border/60 bg-surface py-16 md:py-20">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Monitore como a automação impacta{" "}
            <span className="text-primary">seu negócio</span>
          </h2>
          <p className="mt-2 text-muted-foreground">
            Visão de receita e retenção no mesmo painel, atualizada em tempo
            quase real.
          </p>
        </div>
        <Card className="mx-auto max-w-3xl border-border shadow-md">
          <div className="flex flex-row items-center justify-between px-4 pt-4">
            <p className="text-sm font-medium text-muted-foreground">
              Monitoramento de receita
            </p>
            <span className="text-xs text-muted-foreground">Últ. 6 meses</span>
          </div>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">R$ 62.450</div>
            <p className="text-xs text-muted-foreground">
              MRR aprox. · projeção
            </p>
            <div className="mt-6 flex h-32 items-end justify-between gap-2 border-b border-border pb-0">
              {months.map((m, i) => (
                <div
                  key={m}
                  className="flex h-full min-h-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <div
                    className="w-full max-w-8 min-h-[20%] rounded-t bg-primary/70"
                    style={{ height: `${barHeights[i]}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{m}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg
                  className="h-24 w-24 -rotate-90 text-muted"
                  viewBox="0 0 36 36"
                  aria-hidden
                >
                  <title>Indicador de retenção</title>
                  <path
                    className="text-primary/30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeDasharray="78, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-xs font-bold text-foreground">78%</div>
                  <div className="text-[9px] text-muted-foreground">
                    Retenção
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Retenção ativa
                </div>
                <div className="text-lg font-semibold text-foreground">
                  Base engajada após 90 dias
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Container>
    </section>
  );
}
