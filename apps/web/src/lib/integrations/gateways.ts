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
];
