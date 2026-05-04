import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type GatewayId = "stripe" | "pagarme" | "pagseguro";

export type Gateway = {
  id: GatewayId;
  name: string;
  description: string;
  points: string[];
};

export const PAYMENT_GATEWAYS: Gateway[] = [
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Ideal para vendas globais com foco em assinaturas e alta escala internacional.",
    points: [
      "Suporte a cartões internacionais",
      "Cobranças recorrentes nativas",
      "Alta taxa de aprovação global",
      "Perfeito para escalar fora do Brasil",
    ],
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    description:
      "Infraestrutura robusta para quem precisa de controle total e integrações avançadas.",
    points: [
      "Fluxos de pagamento customizáveis via API",
      "Gestão completa de assinaturas recorrentes",
      "Webhooks em tempo real para automações",
      "Controle de antifraude e regras avançadas",
    ],
  },
  {
    id: "pagseguro",
    name: "PagSeguro",
    description:
      "Solução prática para vender no Brasil com rapidez e alta taxa de conversão.",
    points: [
      "Pix, boleto e cartão integrados",
      "Parcelamento facilitado para vendas",
      "Alta confiança do público brasileiro",
      "Integração simples e rápida",
    ],
  },
];
