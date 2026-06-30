import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AuthGuard } from '../../lib/guards/auth.guard';
import {
  createCheckoutSchema,
  createPortalSchema,
  type AvailablePlan,
  type CheckoutSessionDto,
  type BillingSubscriptionDto,
  type CustomerPortalDto,
} from '../../lib/zod/billing-schemas';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('products')
  async getAvailablePlans(): Promise<AvailablePlan[]> {
    return this.billingService.listProductsWithPrices();
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  async createCheckout(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<CheckoutSessionDto> {
    const input = createCheckoutSchema.parse(body);
    const userId = req.authSession!.userId;
    return this.billingService.createCheckout(
      userId,
      input.priceId,
      input.successUrl,
      input.cancelUrl,
    );
  }

  @Post('portal')
  @UseGuards(AuthGuard)
  async createPortal(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<CustomerPortalDto> {
    const input = createPortalSchema.parse(body);
    const userId = req.authSession!.userId;
    return this.billingService.createPortal(userId, input.returnUrl);
  }

  @Get('subscription')
  @UseGuards(AuthGuard)
  async getSubscription(@Req() req: Request): Promise<BillingSubscriptionDto> {
    const userId = req.authSession!.userId;
    return this.billingService.getSubscription(userId);
  }

  @Post('webhooks')
  async handleWebhookEvent(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('stripe-signature header ausente');
    }
    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException('Raw body vazio');
    }
    return this.billingService.handleStripeWebhook(rawBody, signature);
  }
}
