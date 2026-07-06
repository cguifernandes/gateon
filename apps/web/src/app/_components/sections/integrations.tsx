"use client";

import type { StaticImageData } from "next/image";
import pagarme from "@/assets/gateway/pagarme.svg";
import pagseguro from "@/assets/gateway/pagseguro.svg";
import stripe from "@/assets/gateway/stripe-4.svg";
import { Container } from "@/components/container";
import { type GatewayId, PAYMENT_GATEWAYS } from "@/lib/utils";
import { GatewayCard } from "../gateway-card";

const gatewayLogos: Record<GatewayId, StaticImageData> = {
  pagarme,
  pagseguro,
  stripe,
};

const steps = [
  {
    n: "01",
    label: "Conecte seu gateway",
    desc: "Informe a chave de API para conectar sua conta ao Gateon.",
  },
  {
    n: "02",
    label: "Vincule um plano",
    desc: "Associe um plano de assinatura a um grupo do Telegram.",
  },
  {
    n: "03",
    label: "Configure o webhook",
    desc: "Cadastre a URL de webhook para receber os eventos de pagamento.",
  },
  {
    n: "04",
    label: "Deixe o Gateon cuidar do resto",
    desc: "Eventos cadastrados passam a ser gerenciados automaticamente.",
  },
];

export function IntegrationsSection() {
  return (
    <section className="py-16 md:py-24" id="integracoes">
      <Container>
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <h2 className="font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground">
            Automatize sua comunidade com uma única integração
          </h2>
          <p className="text-center max-w-2xl text-base font-light text-muted-foreground">
            Conecte seu gateway de pagamento e deixe o Gateon gerenciar acessos,
            renovações e cancelamentos automaticamente.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {PAYMENT_GATEWAYS.map((gw, index) => {
            const logo = gatewayLogos[gw.id];
            return (
              <GatewayCard index={index} key={gw.id} gateway={gw} logo={logo} />
            );
          })}
        </div>

        <div className="mt-14">
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Configure em menos de 2 minutos
          </p>

          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.n}
                className="relative flex flex-col items-center text-center"
              >
                {index < steps.length - 1 && (
                  <div className="absolute top-6 left-[60%] hidden h-px w-[80%] bg-border md:block" />
                )}

                <div className="flex size-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-heading text-lg font-bold text-primary">
                  {step.n}
                </div>

                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  {step.label}
                </h3>

                <p className="mt-2 font-light max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
