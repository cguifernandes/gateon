"use client";

import { Container } from "@/components/container";
import { CheckIcon } from "@/components/icons/check";
import { Card } from "@/components/ui/card";

const stripePoints = [
  "Suporte a cartões internacionais",
  "Cobranças recorrentes nativas",
  "Alta taxa de aprovação global",
  "Perfeito para escalar fora do Brasil",
];

const steps = [
  {
    n: "01",
    label: "Conecte o Stripe",
    desc: "Configure a chave de API e URL de webhook no painel do Stripe.",
  },
  {
    n: "02",
    label: "Defina as regras",
    desc: "Escolha quais produtos liberam acesso e por quanto tempo.",
  },
  {
    n: "03",
    label: "Publique e relaxe",
    desc: "O Gateon monitora cada evento e gerencia o grupo automaticamente.",
  },
];

export function IntegrationsSection() {
  return (
    <section className="py-16 md:py-24" id="integracoes">
      <Container>
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <h2 className="font-bold max-w-2xl leading-[1.08] tracking-tight text-2xl text-foreground sm:text-3xl">
            Conecte o Stripe em minutos
          </h2>
          <p className="text-center max-w-2xl text-base font-light text-muted-foreground">
            Conecte seu gateway de pagamento e o Gateon cuida de tudo.
          </p>
        </div>

        <div className="mx-auto max-w-sm">
          <Card className="group h-full rounded-2xl border border-border bg-card py-0 ring-0 gap-0">
            <div className="flex h-28 items-center justify-center border-b border-border px-6">
              <span className="text-2xl font-bold text-foreground tracking-tight">
                Stripe
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex flex-col gap-1">
                <p className="font-bold font-heading text-sm text-foreground">
                  Stripe
                </p>
                <p className="text-xs font-light leading-snug text-muted-foreground">
                  Ideal para vendas globais com foco em assinaturas e alta escala internacional.
                </p>
              </div>
              <ul className="flex flex-col gap-2.5">
                {stripePoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <CheckIcon className="text-primary" size={10} aria-hidden />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <div className="mt-14">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Como funciona
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.n}
                className="relative shadow-sm flex flex-col gap-2 rounded-2xl border border-border bg-card p-5"
              >
                <span className="text-4xl font-bold tabular-nums text-primary">
                  {step.n}.
                </span>
                <div>
                  <p className="font-semibold text-foreground">{step.label}</p>
                  <p className="mt-1 text-sm font-light text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
