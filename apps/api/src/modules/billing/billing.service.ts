import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  availablePlanSchema,
  type AvailablePlan,
  type CheckoutSessionDto,
  type BillingSubscriptionDto,
  type CustomerPortalDto,
  type PlanId,
} from '../../lib/zod/billing-schemas';
import { PLAN_LABELS } from '../../lib/plan/plan-limits';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe!: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('STRIPE_API_KEY');
    if (!apiKey) {
      this.logger.warn('STRIPE_API_KEY não configurada');
    } else {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2026-06-24.dahlia',
      });
    }
  }

  async listProductsWithPrices(): Promise<AvailablePlan[]> {
    const [products, prices] = await Promise.all([
      this.stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      }),
      this.stripe.prices.list({ active: true }),
    ]);

    const priceMap = new Map<string, Stripe.Price[]>();
    for (const price of prices.data) {
      const existing = priceMap.get(price.product as string) ?? [];
      existing.push(price);
      priceMap.set(price.product as string, existing);
    }

    const plans: AvailablePlan[] = [];

    for (const product of products.data) {
      const productPrices = priceMap.get(product.id) ?? [];
      let isHighlight = false;

      for (const price of productPrices) {
        const unitAmount =
          typeof price.unit_amount === 'number' ? price.unit_amount / 100 : 0;
        const interval = price.recurring?.interval ?? null;
        const intervalCount = price.recurring?.interval_count ?? null;

        const features: string[] = [];

        for (const [key, value] of Object.entries(product.metadata ?? {})) {
          if (key.startsWith('is_highlight') && value) {
            isHighlight = true;
          }

          if (key.startsWith('feature_') && value) {
            features.push(value);
          }
        }

        if (features.length === 0 && product.metadata?.gateon_plan) {
          const planId = product.metadata.gateon_plan as PlanId;
          if (PLAN_LABELS[planId]) {
            features.push(`Plano ${PLAN_LABELS[planId]}`);
          }
        }

        plans.push(
          availablePlanSchema.parse({
            id: price.id,
            planId: product.metadata?.gateon_plan ?? null,
            name: product.name,
            description: product.description,
            price: unitAmount,
            currency: price.currency.toUpperCase(),
            interval,
            intervalCount,
            isHighlight,
            features,
          }),
        );
      }
    }

    return plans;
  }

  async createCheckout(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSessionDto> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: { userId },
    });

    if (!session.url) {
      throw new InternalServerErrorException(
        'Falha ao criar sessão de checkout',
      );
    }

    return { url: session.url };
  }

  async createPortal(
    userId: string,
    returnUrl: string,
  ): Promise<CustomerPortalDto> {
    const subscription = await this.prisma.stripeSubscriptions.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('Usuário não possui assinatura ativa');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  async getSubscription(userId: string): Promise<BillingSubscriptionDto> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { planId: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const sub = await this.prisma.stripeSubscriptions.findUnique({
      where: { userId },
    });

    return {
      planId: user.planId as PlanId,
      status: sub?.status ?? 'inactive',
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      stripeCustomerId: sub?.stripeCustomerId ?? null,
      stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
    };
  }

  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ received: boolean }> {
    console.log('[billing-webhook] handleStripeWebhook', {
      rawBodyLength: rawBody.length,
      signaturePrefix: signature.slice(0, 20),
    });

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      console.log('[billing-webhook] STRIPE_WEBHOOK_SECRET não configurada');
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET não configurada',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
      console.log('[billing-webhook] evento construído', {
        id: event.id,
        type: event.type,
      });
    } catch (err) {
      console.log('[billing-webhook] erro na assinatura', {
        error: err instanceof Error ? err.message : err,
      });
      this.logger.error(`Assinatura do webhook inválida`, err);
      throw new BadRequestException('Assinatura do webhook inválida');
    }

    const existing = await this.prisma.stripeWebhookEvents.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existing?.processedAt) {
      console.log('[billing-webhook] evento já processado', { id: event.id });
      return { received: true };
    }

    await this.prisma.stripeWebhookEvents.create({
      data: {
        stripeEventId: event.id,
        type: event.type,
        data: JSON.parse(
          JSON.stringify(event.data.object),
        ) as Prisma.InputJsonValue,
      },
    });

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('[billing-webhook] processando checkout.session.completed');
          await this.handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;
        case 'customer.subscription.updated':
          console.log('[billing-webhook] processando customer.subscription.updated');
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
          );
          break;
        case 'customer.subscription.deleted':
          console.log('[billing-webhook] processando customer.subscription.deleted');
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;
        case 'invoice.paid':
          console.log('[billing-webhook] processando invoice.paid');
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
      }

      await this.prisma.stripeWebhookEvents.update({
        where: { stripeEventId: event.id },
        data: { processedAt: new Date() },
      });

      console.log('[billing-webhook] processado com sucesso', { id: event.id, type: event.type });
    } catch (err) {
      console.log('[billing-webhook] erro ao processar', {
        id: event.id,
        type: event.type,
        error: err instanceof Error ? err.message : err,
      });
      this.logger.error(`Erro ao processar webhook ${event.type}: ${err}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId ?? session.client_reference_id;
    console.log('[billing-webhook] handleCheckoutCompleted', {
      userId,
      customerId: session.customer,
      subscriptionId: session.subscription,
      metadata: session.metadata,
      clientReferenceId: session.client_reference_id,
    });

    if (!userId) {
      this.logger.warn('Checkout completed sem userId');
      return;
    }

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!subscriptionId) {
      this.logger.warn('Checkout completed sem subscriptionId');
      return;
    }

    const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
    const raw = sub as unknown as {
      status: string;
      items: { data: { price: { id: string } }[] };
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
    };

    console.log('[billing-webhook] subscription retrieved', {
      status: raw.status,
      priceId: raw.items.data[0]?.price.id,
    });

    const planId = await this.resolvePlanFromSubscription(sub);

    console.log('[billing-webhook] plan resolved', { planId });

    await this.prisma.stripeSubscriptions.upsert({
      where: { userId },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: raw.items.data[0]?.price.id ?? '',
        status: this.mapStripeStatus(raw.status) as SubscriptionStatus,
        currentPeriodStart: raw.current_period_start
          ? new Date(raw.current_period_start * 1000)
          : null,
        currentPeriodEnd: raw.current_period_end
          ? new Date(raw.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: raw.cancel_at_period_end,
      },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: raw.items.data[0]?.price.id ?? '',
        status: this.mapStripeStatus(raw.status) as SubscriptionStatus,
        currentPeriodStart: raw.current_period_start
          ? new Date(raw.current_period_start * 1000)
          : null,
        currentPeriodEnd: raw.current_period_end
          ? new Date(raw.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: raw.cancel_at_period_end,
      },
    });

    if (planId && planId !== 'free') {
      await this.prisma.users.update({
        where: { id: userId },
        data: { planId },
      });
      console.log('[billing-webhook] user plan updated', { userId, planId });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const raw = subscription as unknown as {
      id: string;
      status: string;
      items: { data: { price: { id: string } }[] };
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
      canceled_at: number | null;
    };

    const dbSub = await this.prisma.stripeSubscriptions.findFirst({
      where: { stripeSubscriptionId: raw.id },
    });

    if (!dbSub) return;

    const planId = await this.resolvePlanFromSubscription(subscription);

    await this.prisma.stripeSubscriptions.update({
      where: { id: dbSub.id },
      data: {
        status: this.mapStripeStatus(raw.status) as SubscriptionStatus,
        currentPeriodStart: raw.current_period_start
          ? new Date(raw.current_period_start * 1000)
          : null,
        currentPeriodEnd: raw.current_period_end
          ? new Date(raw.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: raw.cancel_at_period_end,
        canceledAt: raw.canceled_at ? new Date(raw.canceled_at * 1000) : null,
      },
    });

    if (planId) {
      await this.prisma.users.update({
        where: { id: dbSub.userId },
        data: { planId },
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const raw = subscription as unknown as { id: string };

    const dbSub = await this.prisma.stripeSubscriptions.findFirst({
      where: { stripeSubscriptionId: raw.id },
    });

    if (!dbSub) return;

    await this.prisma.stripeSubscriptions.update({
      where: { id: dbSub.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    await this.prisma.users.update({
      where: { id: dbSub.userId },
      data: { planId: 'free' },
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const raw = invoice as unknown as {
      subscription: string | null;
      status: string;
      lines: {
        data: { period: { end: number } }[];
      };
    };

    if (raw.subscription) {
      const dbSub = await this.prisma.stripeSubscriptions.findFirst({
        where: { stripeSubscriptionId: raw.subscription },
      });

      if (dbSub && raw.status === 'paid') {
        await this.prisma.stripeSubscriptions.update({
          where: { id: dbSub.id },
          data: {
            currentPeriodEnd: raw.lines.data[0]?.period?.end
              ? new Date(raw.lines.data[0].period.end * 1000)
              : undefined,
          },
        });
      }
    }
  }

  private async resolvePlanFromSubscription(
    subscription: Stripe.Subscription,
  ): Promise<PlanId | null> {
    const raw = subscription as unknown as {
      items: { data: { price: { id: string } }[] };
    };
    const priceId = raw.items.data[0]?.price.id;
    if (!priceId) return null;

    try {
      const price = await this.stripe.prices.retrieve(priceId, {
        expand: ['product'],
      });
      const product = price.product as Stripe.Product;
      const gateonPlan = product.metadata?.gateon_plan;

      if (gateonPlan === 'starter' || gateonPlan === 'pro') {
        return gateonPlan;
      }
    } catch {
      this.logger.warn(
        `Não foi possível resolver o plano para o price ${priceId}`,
      );
    }

    return null;
  }

  private mapStripeStatus(status: string): string {
    const map: Record<string, string> = {
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'INCOMPLETE_EXPIRED',
      trialing: 'TRIALING',
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'UNPAID',
      paused: 'PAUSED',
    };
    return map[status] ?? status.toUpperCase();
  }
}
