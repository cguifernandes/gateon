import { Module, forwardRef } from '@nestjs/common';
import { GroupLimitsModule } from '../group-limits/group-limits.module';
import { AuthModule } from '../auth/auth.module';
import { StripeBillingModule } from '../stripe-billing/stripe-billing.module';
import { TelegramModule } from '../telegram/telegram.module';
import {
  BotStartSettingsController,
  BotStartSettingsInternalController,
} from './bot-start-settings.controller';
import { BotStartSettingsService } from './bot-start-settings.service';

@Module({
  imports: [
    AuthModule,
    GroupLimitsModule,
    TelegramModule,
    forwardRef(() => StripeBillingModule),
  ],
  controllers: [BotStartSettingsController, BotStartSettingsInternalController],
  providers: [BotStartSettingsService],
  exports: [BotStartSettingsService],
})
export class BotStartSettingsModule {}
