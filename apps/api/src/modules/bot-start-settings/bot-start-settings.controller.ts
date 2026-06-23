import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../../lib/guards/auth.guard';
import { BotStartSettingsService } from './bot-start-settings.service';
import {
  telegramBotStartCheckoutButtonsSchema,
  telegramBotStartPaymentGroupsSchema,
  telegramBotStartSettingsPatchSchema,
} from '../../lib/zod/bot-start-settings-schemas';
import { StripeBillingService } from '../stripe-billing/stripe-billing.service';

@Controller('bot-start-settings')
export class BotStartSettingsController {
  constructor(private readonly botStartSettings: BotStartSettingsService) {}

  @Get()
  @UseGuards(AuthGuard)
  getSettings(@Req() req: Request) {
    return this.botStartSettings.getForUser(this.getUserId(req));
  }

  @Patch()
  @UseGuards(AuthGuard)
  updateSettings(@Req() req: Request, @Body() body: unknown) {
    const input = telegramBotStartSettingsPatchSchema.parse(body);
    return this.botStartSettings.updateForUser(this.getUserId(req), input);
  }

  private getUserId(req: Request) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return userId;
  }
}

@Controller('telegram/internal/bot-start')
export class BotStartSettingsInternalController {
  constructor(
    private readonly botStartSettings: BotStartSettingsService,
    private readonly stripeBilling: StripeBillingService,
  ) {}

  @Get('public/:token')
  getPublicSettings(
    @Headers('x-gateon-bot-secret') botSecret: string | undefined,
    @Param('token') token: string,
  ) {
    if (!this.botStartSettings.isInternalSecretValid(botSecret)) {
      throw new UnauthorizedException();
    }

    return this.botStartSettings.getPublicByToken(token);
  }

  @Post('checkout-buttons')
  async createCheckoutButtons(
    @Headers('x-gateon-bot-secret') botSecret: string | undefined,
    @Body() body: unknown,
  ) {
    if (!this.botStartSettings.isInternalSecretValid(botSecret)) {
      throw new UnauthorizedException();
    }

    const input = telegramBotStartCheckoutButtonsSchema.parse(body);
    const buttons = await this.stripeBilling.createCheckoutButtonsForStart({
      publicStartToken: input.token,
      telegramUserId: input.telegramUserId,
      telegramGroupId: input.telegramGroupId,
    });

    return { buttons };
  }

  @Post('payment-groups')
  async listPaymentGroups(
    @Headers('x-gateon-bot-secret') botSecret: string | undefined,
    @Body() body: unknown,
  ) {
    if (!this.botStartSettings.isInternalSecretValid(botSecret)) {
      throw new UnauthorizedException();
    }

    const input = telegramBotStartPaymentGroupsSchema.parse(body);
    const groups = await this.stripeBilling.listPaymentGroupsForStart({
      publicStartToken: input.token,
    });

    return { groups };
  }
}
