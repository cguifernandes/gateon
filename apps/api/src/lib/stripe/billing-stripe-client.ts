import { BadRequestException } from '@nestjs/common';
import { formatStripePlanLabel, formatStripePriceAmount } from './price-label';
import { StripePrice } from '../zod/billing-schemas';

type StripeListResponse<T> = {
  data?: T[];
  has_more?: boolean;
};

export type StripeCustomerRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export type StripeProductRecord = {
  id: string;
  name?: string | null;
  description?: string | null;
  active?: boolean;
};

export type StripePriceRecord = {
  id: string;
  nickname?: string | null;
  unit_amount?: number | null;
  currency?: string;
  active?: boolean;
  type?: string;
  recurring?: {
    interval?: string;
    interval_count?: number;
  } | null;
  product?: string | StripeProductRecord | null;
};

export type StripeSubscriptionRecord = {
  id: string;
  customer?: string | StripeCustomerRecord | null;
  status?: string;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
        nickname?: string | null;
        product?: string | { name?: string | null } | null;
        recurring?: {
          interval?: string;
          interval_count?: number;
        } | null;
      } | null;
    }>;
  };
};

export type StripeInvoiceRecord = {
  id: string;
  customer?: string | StripeCustomerRecord | null;
  subscription?: string | { id?: string } | null;
  payment_intent?: string | { id?: string } | null;
  status?: string;
  amount_paid?: number;
  amount_due?: number;
  currency?: string;
  status_transitions?: {
    paid_at?: number | null;
  };
  created?: number;
};

export type StripeCheckoutSessionRecord = {
  id: string;
  url?: string | null;
  status?: string;
  payment_status?: string;
  customer?: string | StripeCustomerRecord | null;
  subscription?: string | { id?: string } | null;
  metadata?: Record<string, string>;
};

export class StripeBillingStripeClient {
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(private readonly apiKey: string) {}

  async listRecurringPrices(): Promise<StripePriceRecord[]> {
    return this.listAll<StripePriceRecord>('/prices', {
      limit: '100',
      active: 'true',
      type: 'recurring',
      'expand[]': ['data.product'],
    });
  }

  async requestWithResponse<T>(
    path: string,
  ): Promise<{ data: T; headers: Headers }> {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error);
    }

    const data = (await res.json()) as T;

    return {
      data,
      headers: res.headers,
    };
  }

  async getPrice(id: string): Promise<{
    price: StripePrice;
    stripeAccountId?: string;
  }> {
    const response = await this.requestWithResponse<StripePrice>(
      `/prices/${id}?expand[]=product`,
    );

    return {
      price: response.data,
      stripeAccountId: response.headers.get('stripe-account') ?? undefined,
    };
  }

  async listCustomers(): Promise<StripeCustomerRecord[]> {
    return this.listAll<StripeCustomerRecord>('/customers', {
      limit: '100',
    });
  }

  async listSubscriptions(): Promise<StripeSubscriptionRecord[]> {
    return this.listAll<StripeSubscriptionRecord>('/subscriptions', {
      limit: '100',
      status: 'all',
      'expand[]': ['data.customer', 'data.items.data.price'],
    });
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<StripeSubscriptionRecord> {
    return this.request<StripeSubscriptionRecord>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        'expand[]': ['customer', 'items.data.price'],
      },
    );
  }

  async getProduct(
    productId: string,
  ): Promise<{ id: string; name?: string | null }> {
    return this.request(`/products/${productId}`);
  }

  async listInvoices(): Promise<StripeInvoiceRecord[]> {
    return this.listAll<StripeInvoiceRecord>('/invoices', {
      limit: '100',
      'expand[]': ['data.customer', 'data.payment_intent'],
    });
  }

  async createCheckoutSession(input: {
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
    clientReferenceId?: string;
  }): Promise<StripeCheckoutSessionRecord> {
    const body = new URLSearchParams();
    body.set('mode', 'subscription');
    body.set('success_url', input.successUrl);
    body.set('cancel_url', input.cancelUrl);
    body.set('line_items[0][price]', input.priceId);
    body.set('line_items[0][quantity]', '1');
    if (input.clientReferenceId) {
      body.set('client_reference_id', input.clientReferenceId);
    }
    for (const [key, value] of Object.entries(input.metadata)) {
      body.set(`metadata[${key}]`, value);
    }

    return this.postRequest<StripeCheckoutSessionRecord>(
      '/checkout/sessions',
      body,
    );
  }

  async retrieveCheckoutSession(
    sessionId: string,
  ): Promise<StripeCheckoutSessionRecord> {
    return this.request<StripeCheckoutSessionRecord>(
      `/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        'expand[]': ['customer', 'subscription'],
      },
    );
  }

  async createBillingPortalSession(input: {
    customer: string;
    returnUrl: string;
  }): Promise<{ url: string | null }> {
    const body = new URLSearchParams();
    body.set('customer', input.customer);
    body.set('return_url', input.returnUrl);

    return this.postRequest<{ url: string | null }>(
      '/billing_portal/sessions',
      body,
    );
  }

  mapCatalogPrice(price: StripePriceRecord) {
    const product =
      price.product && typeof price.product === 'object' ? price.product : null;

    return {
      id: price.id,
      productId:
        product?.id ?? (typeof price.product === 'string' ? price.product : ''),
      productName: product?.name?.trim() || 'Produto sem nome',
      productDescription: product?.description?.trim() ?? null,
      nickname: price.nickname?.trim() ?? null,
      unitAmountCents: price.unit_amount ?? null,
      currency: price.currency ?? 'brl',
      interval: price.recurring?.interval ?? null,
      intervalCount: price.recurring?.interval_count ?? null,
      label: formatStripePlanLabel(price),
      priceLabel: formatStripePriceAmount(price),
    };
  }

  private async listAll<T>(
    path: string,
    params: StripeRequestParams,
  ): Promise<T[]> {
    const rows: T[] = [];
    let startingAfter: string | undefined;

    for (let page = 0; page < 20; page += 1) {
      const response = await this.request<StripeListResponse<T>>(path, {
        ...params,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      const batch = response.data ?? [];
      rows.push(...batch);

      if (!response.has_more || batch.length === 0) {
        return rows;
      }

      const last = batch[batch.length - 1] as { id?: string };
      if (!last.id) {
        return rows;
      }
      startingAfter = last.id;
    }

    return rows;
  }

  private mapStripeError(message: string): string {
    if (
      message.includes('Expired API Key') ||
      message.includes('Invalid API Key') ||
      message.includes('No API key provided')
    ) {
      return 'A chave de API da Stripe é inválida, expirou ou foi revogada. Gere uma nova chave restrita e atualize a integração.';
    }

    if (message.includes('Permission denied')) {
      const permissionMap: Record<string, string> = {
        accounts_kyc_basic_read:
          'Core → Basic Business Contact Information (Leitura)',
        customers_read: 'Core → Customers (Leitura)',
        products_read: 'Core → Products (Leitura)',
        prices_read: 'Billing → Prices (Leitura)',
        subscriptions_read: 'Billing → Subscriptions (Leitura)',
        invoices_read: 'Billing → Invoices (Leitura)',
      };

      const match = message.match(/'([^']+_read)'/);

      if (match) {
        const permission = permissionMap[match[1]];

        if (permission) {
          return `A chave da Stripe não possui a permissão "${permission}". Atualize as permissões da chave restrita e tente novamente.`;
        }
      }

      return 'A chave da Stripe não possui as permissões necessárias para esta operação.';
    }

    return message;
  }

  private async request<T>(
    path: string,
    params?: StripeRequestParams,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    this.appendSearchParams(url, params);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(20_000),
    });

    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | T
      | null;

    if (!response.ok) {
      const message =
        body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error?.message === 'string'
          ? body.error.message
          : 'Não foi possível comunicar com a Stripe.';

      throw new BadRequestException(this.mapStripeError(message));
    }

    return body as T;
  }

  private async postRequest<T>(
    path: string,
    body: URLSearchParams,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(20_000),
    });

    const parsed = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | T
      | null;

    if (!response.ok) {
      const message =
        parsed &&
        typeof parsed === 'object' &&
        'error' in parsed &&
        typeof parsed.error?.message === 'string'
          ? parsed.error.message
          : 'Não foi possível comunicar com a Stripe.';
      throw new BadRequestException(message);
    }

    return parsed as T;
  }

  private appendSearchParams(url: URL, params?: StripeRequestParams) {
    for (const [key, value] of Object.entries(params ?? {})) {
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, item);
        }
        continue;
      }
      url.searchParams.append(key, value);
    }
  }
}

type StripeRequestParams = Record<string, string | string[]>;

export function subscriptionIncludesPrice(
  subscription: StripeSubscriptionRecord,
  priceId: string,
): boolean {
  return (
    subscription.items?.data?.some((item) => item.price?.id === priceId) ??
    false
  );
}

export function getSubscriptionBillingInterval(
  subscription: StripeSubscriptionRecord,
): { interval?: string; intervalCount?: number } | null {
  const price = subscription.items?.data?.[0]?.price;
  if (!price?.recurring) return null;
  return {
    interval: price.recurring.interval,
    intervalCount: price.recurring.interval_count,
  };
}

export function getStripeCustomerId(
  customer: string | StripeCustomerRecord | null | undefined,
): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

export function getStripeCustomerSnapshot(
  customer: string | StripeCustomerRecord | null | undefined,
): StripeCustomerRecord | null {
  if (!customer || typeof customer === 'string') return null;
  return customer;
}

export function getStripeSubscriptionId(
  subscription: string | { id?: string } | null | undefined,
): string | null {
  if (!subscription) return null;
  return typeof subscription === 'string'
    ? subscription
    : (subscription.id ?? null);
}
