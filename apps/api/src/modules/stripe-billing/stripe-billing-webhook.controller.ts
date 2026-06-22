import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeBillingWebhookService } from './stripe-billing-webhook.service';

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
