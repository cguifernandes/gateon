export type GatewayId = "stripe" | "pagarme" | "pagseguro";

export type Gateway = {
  id: GatewayId;
  name: string;
  description: string;
  isAvaliable: boolean;
};

export const PAYMENT_GATEWAYS: Gateway[] = [
  {
    id: "pagarme",
    name: "Pagar.me",
    description:
      "Infraestrutura robusta para quem precisa de controle total e integrações avançadas.",

    isAvaliable: false,
  },
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Ideal para vendas globais com foco em assinaturas e alta escala internacional.",

    isAvaliable: true,
  },

  {
    id: "pagseguro",
    name: "PagSeguro",
    description:
      "Solução prática para vender no Brasil com rapidez e alta taxa de conversão.",
    isAvaliable: false,
  },
];
