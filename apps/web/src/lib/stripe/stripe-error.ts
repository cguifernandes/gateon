export function getStripeError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      title: "Erro ao conectar com a Stripe",
      description: "Não foi possível listar os planos da Stripe.",
    };
  }

  const message = error.message;

  // Permissão insuficiente
  if (message.includes("accounts_kyc_basic_read")) {
    return {
      title: "Permissão insuficiente",
      description:
        'Sua chave restrita precisa da permissão "Core → Basic Business Contact Information" com acesso de leitura.',
    };
  }

  if (message.includes("products_read")) {
    return {
      title: "Permissão insuficiente",
      description:
        'Sua chave restrita precisa da permissão "Core → Products" com acesso de leitura.',
    };
  }

  if (message.includes("prices_read")) {
    return {
      title: "Permissão insuficiente",
      description:
        'Sua chave restrita precisa da permissão "Billing → Prices" com acesso de leitura.',
    };
  }

  if (message.includes("subscriptions_read")) {
    return {
      title: "Permissão insuficiente",
      description:
        'Sua chave restrita precisa da permissão "Billing → Subscriptions" com acesso de leitura.',
    };
  }

  if (message.includes("invoices_read")) {
    return {
      title: "Permissão insuficiente",
      description:
        'Sua chave restrita precisa da permissão "Billing → Invoices" com acesso de leitura.',
    };
  }

  if (message.includes("customers_read")) {
    return {
      title: "Permissão insuficiente",
      description:
        'Sua chave restrita precisa da permissão "Core → Customers" com acesso de leitura.',
    };
  }

  // Chave inválida
  if (
    message.includes("Invalid API Key") ||
    message.includes("No API key provided")
  ) {
    return {
      title: "Chave inválida",
      description:
        "A chave da Stripe é inválida ou foi digitada incorretamente.",
    };
  }

  return {
    title: "Erro ao conectar com a Stripe",
    description: message,
  };
}
