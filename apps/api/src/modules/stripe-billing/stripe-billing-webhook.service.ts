import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeBillingConnectionStatus } from '@prisma/client';
import { verifyStripeWebhookSignature } from '../../lib/stripe-webhook-signature';
import { decryptSecretValue } from '../../utils/utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  type StripeInvoiceRecord,
  type StripeSubscriptionRecord,
} from './stripe-billing-stripe-client';
import { StripeBillingService } from './stripe-billing.service';
import { StripeBillingSyncService } from './stripe-billing-sync.service';

type StripeWebhookEnvelope = {
  id?: string;
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

@Injectable()
export class StripeBillingWebhookService {
  private readonly logger = new Logger(StripeBillingWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sync: StripeBillingSyncService,
    private readonly stripeBilling: StripeBillingService,
  ) {}

  async handle(
    connectionId: string,
    signature: string | undefined,
    rawBody: Buffer,
  ): Promise<void> {
    const secret = await this.resolveSigningSecret(connectionId);
    if (!secret) {
      throw new BadRequestException(
        'Webhook não configurado para esta integração.',
      );
    }

    if (!verifyStripeWebhookSignature(rawBody, signature, secret)) {
      throw new BadRequestException('Assinatura do webhook inválida.');
    }

    let event: StripeWebhookEnvelope;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as StripeWebhookEnvelope;
    } catch {
      throw new BadRequestException('Payload do webhook inválido.');
    }

    await this.processEvent(connectionId, event);
  }

  private async resolveSigningSecret(connectionId: string): Promise<string | null> {
    const connection = await this.prisma.stripeBillingConnections.findFirst({
      where: {
        id: connectionId,
        status: StripeBillingConnectionStatus.CONNECTED,
      },
      select: { encryptedWebhookSigningSecret: true },
    });

    if (connection?.encryptedWebhookSigningSecret) {
      try {
        return decryptSecretValue(connection.encryptedWebhookSigningSecret);
      } catch {
        return null;
      }
    }

    const fallback = this.config.get<string>('STRIPE_WEBHOOK_SIGNING_SECRET')?.trim();
    return fallback || null;
  }

  private async processEvent(
    connectionId: string,
    event: StripeWebhookEnvelope,
  ): Promise<void> {
    const type = event.type?.trim();
    const object = event.data?.object;
    if (!type || !object) {
      return;
    }

    try {
      switch (type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.sync.applySubscriptionFromWebhook(
            connectionId,
            object as StripeSubscriptionRecord,
          );
          break;
        case 'invoice.paid':
        case 'invoice.payment_failed':
        case 'invoice.voided':
          await this.sync.applyInvoiceFromWebhook(
            connectionId,
            object as StripeInvoiceRecord,
            type,
          );
          break;
        case 'checkout.session.completed': {
          const sessionId =
            typeof object.id === 'string' ? object.id.trim() : '';
          if (!sessionId) {
            break;
          }
          try {
            await this.stripeBilling.finalizeCheckoutSession(sessionId);
          } catch (error) {
            this.logger.debug(
              `Ignored checkout.session.completed ${sessionId}: ${
                error instanceof Error ? error.message : 'unknown'
              }`,
            );
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.logger.error(
        `Failed to process Stripe webhook ${type} for connection ${connectionId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw error;
    }
  }
}
