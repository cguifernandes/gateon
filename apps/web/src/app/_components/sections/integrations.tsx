import type { StaticImageData } from "next/image";
import pagarme from "@/assets/gateway/pagarme.svg";
import pagseguro from "@/assets/gateway/pagseguro.svg";
import stripe from "@/assets/gateway/stripe-4.svg";
import type { GatewayId } from "@/lib/utils";
import { PAYMENT_GATEWAYS } from "@/lib/utils";
import { Container } from "@/components/container";
import { GatewayCard } from "../gateway-card";

const gatewayLogos: Record<GatewayId, StaticImageData> = {
  pagarme,
  pagseguro,
  stripe,
};

const steps = [
  {
    n: "01",
    label: "Conecte o gateway",
    desc: "Configure a chave de API e URL de webhook no painel do seu provedor.",
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
            Conecte seu gateway favorito em minutos
          </h2>
          <p className="text-center max-w-2xl text-base font-light text-muted-foreground">
            Escolha o provedor de pagamento e o Gateon cuida de tudo.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {PAYMENT_GATEWAYS.map((gw) => {
            const logo = gatewayLogos[gw.id];
            return <GatewayCard key={gw.id} gateway={gw} logo={logo} />;
          })}
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
