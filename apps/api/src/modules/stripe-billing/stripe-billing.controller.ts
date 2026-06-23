import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';
import {
  stripeBillingConnectSchema,
  stripeBillingPreviewCatalogSchema,
  stripeBillingUpdateLinkedGroupSchema,
  stripeBillingUpdateWebhookSecretSchema,
} from '../../lib/zod/stripe-billing-schemas';
import { AuthGuard } from '../../lib/guards/auth.guard';
import {
  StripeBillingService,
  StripeBillingWebhookService,
} from './stripe-billing.service';

@Controller('stripe-billing')
export class StripeBillingController {
  constructor(private readonly stripeBilling: StripeBillingService) {}

  @Get()
  @UseGuards(AuthGuard)
  getStatus(@Req() req: Request) {
    return this.stripeBilling.getStatus(this.getUserId(req));
  }

  @Get('connections/options')
  @UseGuards(AuthGuard)
  listConnectionOptions(@Req() req: Request) {
    return this.stripeBilling.listConnectionOptions(this.getUserId(req));
  }

  @Post('catalog')
  @UseGuards(AuthGuard)
  previewCatalog(@Req() req: Request, @Body() body: unknown) {
    return this.stripeBilling.previewCatalog(
      this.getUserId(req),
      stripeBillingPreviewCatalogSchema.parse(body),
    );
  }

  @Post('connect')
  @UseGuards(AuthGuard)
  connect(@Req() req: Request, @Body() body: unknown) {
    return this.stripeBilling.connect(
      this.getUserId(req),
      stripeBillingConnectSchema.parse(body),
    );
  }

  @Post('checkout/finalize')
  async finalizeCheckout(@Body() body: unknown) {
    const parsed = z
      .object({ sessionId: z.string().trim().min(1) })
      .parse(body);
    return this.stripeBilling.finalizeCheckoutSession(parsed.sessionId);
  }

  @Post(':connectionId/sync')
  @UseGuards(AuthGuard)
  sync(@Req() req: Request, @Param('connectionId') connectionId: string) {
    return this.stripeBilling.syncNow(this.getUserId(req), connectionId);
  }

  @Patch(':connectionId/linked-group')
  @UseGuards(AuthGuard)
  updateLinkedGroup(
    @Req() req: Request,
    @Param('connectionId') connectionId: string,
    @Body() body: unknown,
  ) {
    return this.stripeBilling.updateLinkedGroup(
      this.getUserId(req),
      connectionId,
      stripeBillingUpdateLinkedGroupSchema.parse(body),
    );
  }

  @Patch(':connectionId/webhook-secret')
  @UseGuards(AuthGuard)
  updateWebhookSecret(
    @Req() req: Request,
    @Param('connectionId') connectionId: string,
    @Body() body: unknown,
  ) {
    return this.stripeBilling.updateWebhookSecret(
      this.getUserId(req),
      connectionId,
      stripeBillingUpdateWebhookSecretSchema.parse(body),
    );
  }

  @Delete(':connectionId')
  @UseGuards(AuthGuard)
  disconnect(@Req() req: Request, @Param('connectionId') connectionId: string) {
    return this.stripeBilling.disconnect(this.getUserId(req), connectionId);
  }

  private getUserId(req: Request) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return userId;
  }
}

@Controller('stripe-billing/webhooks')
@SkipThrottle()
export class StripeBillingWebhookController {
  constructor(private readonly webhooks: StripeBillingWebhookService) {}

  @Post(':connectionId')
  async handleWebhook(
    @Param('connectionId') connectionId: string,
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException('Corpo da requisição ausente.');
    }

    await this.webhooks.handle(connectionId, signature, rawBody);
    return { received: true };
  }
}
