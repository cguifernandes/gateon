"use client";

import { motion } from "motion/react";
import { Container } from "@/components/container";
import { CheckIcon } from "@/components/icons/check";
import { XIcon } from "@/components/icons/x";
import { Badge } from "@/components/ui/badge";

const comparisons = [
  {
    label: "Controle de pagamentos",
    without: "Conferir pagamentos manualmente",
    with: "Pagamentos reconciliados em tempo real",
  },
  {
    label: "Convites para o grupo",
    without: "Enviar links de convite um por um",
    with: "Convites enviados automaticamente",
  },
  {
    label: "Gestão de membros",
    without: "Remover inadimplentes na mão",
    with: "Remoção automática por inadimplência",
  },
  {
    label: "Atendimento",
    without: "Responder suporte a cada renovação",
    with: "Suporte respondido pelo próprio fluxo",
  },
  {
    label: "Cobranças",
    without: "Perder receita com falhas de cobrança",
    with: "Retentativas inteligentes de cobrança",
  },
];

export function ComparisonSection() {
  return (
    <section className="bg-white scroll-mt-24 py-16 md:py-20" id="comparacao">
      <Container className="flex items-center w-full flex-col">
        <Badge className="mb-4">Problemas resolvidos</Badge>
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <h2 className="font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground">
            Manual vs Automático
          </h2>
          <p className="text-center max-w-2xl text-base font-light text-muted-foreground">
            Veja como o Gateon transforma a operação do seu grupo pago no
            Telegram.
          </p>
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: false,
                amount: 0.3,
              }}
              transition={{
                duration: 0.4,
                delay: 0 * 0.1,
                ease: "linear",
              }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-10 border border-destructive/30 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <XIcon size={18} />
                </div>

                <div>
                  <p className="font-semibold font-heading text-foreground">
                    Antes
                  </p>
                  <p className="text-sm font-light text-muted-foreground">
                    Processos manuais e repetitivos
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {comparisons.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl flex flex-col gap-y-1 border border-border p-4"
                  >
                    <p className="text-xs font-semibold font-heading uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>

                    <p className="text-sm font-medium text-foreground">
                      {item.without}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: false,
                amount: 0.3,
              }}
              transition={{
                duration: 0.4,
                delay: 1 * 0.1,
                ease: "linear",
              }}
              className="rounded-2xl border border-primary/20 bg-primary/10 p-6"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-10 border border-primary/20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckIcon size={18} />
                </div>

                <div>
                  <p className="font-semibold font-heading text-foreground">
                    Depois — com Gateon
                  </p>
                  <p className="text-sm font-light text-muted-foreground">
                    Tudo automatizado
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {comparisons.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl flex flex-col gap-y-1 border border-primary/20 bg-background p-4"
                  >
                    <p className="text-xs font-semibold font-heading uppercase tracking-wide text-primary">
                      {item.label}
                    </p>

                    <p className="text-sm font-medium text-foreground">
                      {item.with}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
