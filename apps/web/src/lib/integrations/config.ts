import type { StaticImageData } from "next/image";
import pagarmeLogo from "@/assets/gateway/pagarme.svg";
import pagseguroLogo from "@/assets/gateway/pagseguro.svg";
import stripeLogo from "@/assets/gateway/stripe-4.svg";
import type { GatewayId } from "@/lib/integrations/gateways";

export type IntegrationProviderStatus = "available" | "coming_soon";

export type IntegrationProvider = {
  id: GatewayId;
  name: string;
  description: string;
  status: IntegrationProviderStatus;
  logo: StaticImageData;
};

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Monitore assinaturas, pagamentos e vencimentos com cobranças recorrentes.",
    status: "available",
    logo: stripeLogo,
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    description:
      "Controle assinaturas e webhooks para automações avançadas no Brasil.",
    status: "coming_soon",
    logo: pagarmeLogo,
  },
  {
    id: "pagseguro",
    name: "PagSeguro",
    description:
      "Acompanhe Pix, boleto e cartão com foco no mercado brasileiro.",
    status: "coming_soon",
    logo: pagseguroLogo,
  },
];

export const INTEGRATION_PROVIDER_LOGOS: Record<GatewayId, StaticImageData> = {
  stripe: stripeLogo,
  pagarme: pagarmeLogo,
  pagseguro: pagseguroLogo,
};

export function getIntegrationProvider(id: GatewayId) {
  return INTEGRATION_PROVIDERS.find((provider) => provider.id === id);
}
