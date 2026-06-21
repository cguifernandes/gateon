import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import {
  stripeBillingConnectSchema,
  stripeBillingPreviewCatalogSchema,
  stripeBillingUpdateLinkedGroupSchema,
} from './schemas/stripe-billing-schemas';
import { AuthGuard } from '../auth/guards/auth.guard';
import { StripeBillingService } from './stripe-billing.service';

@Controller('stripe-billing')
export class StripeBillingController {
  constructor(private readonly stripeBilling: StripeBillingService) {}

  @Get()
  @UseGuards(AuthGuard)
  getStatus(@Req() req: Request) {
    return this.stripeBilling.getStatus(this.getUserId(req));
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
    await this.stripeBilling.finalizeCheckoutSession(parsed.sessionId);
    return { success: true };
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
