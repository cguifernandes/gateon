import { Container } from "@/components/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    n: 1,
    title: "Conecte o gateway e o bot",
    desc: "Cole as chaves e vinculamos o Telegram com segurança em minutos.",
  },
  {
    n: 2,
    title: "Configure a oferta e o grupo",
    desc: "Defina preço, ciclo e quem entra (ou sai) conforme o pagamento.",
  },
  {
    n: 3,
    title: "Acompanhe e evolua",
    desc: "Métricas, alertas e automações para crescer com previsibilidade.",
  },
];

export function StepsSection() {
  return (
    <section className="border-t border-border/60 bg-surface py-16 md:py-20">
      <Container>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Comece a usar em{" "}
            <span className="text-primary">3 passos simples</span>
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sem código obrigatório. Você lidera a estratégia, a plataforma
            executa o operacional.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <Card
              key={s.n}
              className="border-slate-300/80 bg-surface-container-high/30 text-center"
            >
              <CardHeader>
                <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-border bg-card text-2xl font-bold text-primary">
                  {s.n}
                </div>
                <CardTitle className="text-base">
                  Passo {s.n} — {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {s.desc}
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
