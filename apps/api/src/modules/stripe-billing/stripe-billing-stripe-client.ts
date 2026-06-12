import { BadRequestException } from '@nestjs/common';
import {
  formatStripePlanLabel,
  formatStripePriceAmount,
} from '../../lib/stripe-price-label';

type StripeListResponse<T> = {
  data?: T[];
  has_more?: boolean;
};

type StripeAccount = {
  id: string;
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
      } | null;
    }>;
  };
};

export type StripeInvoiceRecord = {
  id: string;
  customer?: string | StripeCustomerRecord | null;
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

export class StripeBillingStripeClient {
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(private readonly apiKey: string) {}

  async getAccount(): Promise<StripeAccount> {
    return this.request<StripeAccount>('/account');
  }

  async listRecurringPrices(): Promise<StripePriceRecord[]> {
    return this.listAll<StripePriceRecord>('/prices', {
      limit: '100',
      active: 'true',
      type: 'recurring',
      'expand[]': ['data.product'],
    });
  }

  async getPrice(priceId: string): Promise<StripePriceRecord> {
    return this.request<StripePriceRecord>(`/prices/${priceId}`, {
      'expand[]': ['product'],
    });
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
      throw new BadRequestException(message);
    }

    return body as T;
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

export function getStripePaymentIntentId(
  paymentIntent: string | { id?: string } | null | undefined,
): string | null {
  if (!paymentIntent) return null;
  return typeof paymentIntent === 'string'
    ? paymentIntent
    : (paymentIntent.id ?? null);
}
