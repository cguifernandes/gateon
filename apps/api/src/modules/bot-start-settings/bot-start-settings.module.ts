import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StripeBillingModule } from '../stripe-billing/stripe-billing.module';
import {
  BotStartSettingsController,
  BotStartSettingsInternalController,
} from './bot-start-settings.controller';
import { BotStartSettingsService } from './bot-start-settings.service';

@Module({
  imports: [AuthModule, StripeBillingModule],
  controllers: [BotStartSettingsController, BotStartSettingsInternalController],
  providers: [BotStartSettingsService],
  exports: [BotStartSettingsService],
})
export class BotStartSettingsModule {}
