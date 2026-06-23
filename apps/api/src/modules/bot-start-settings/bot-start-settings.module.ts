import { Module, forwardRef } from '@nestjs/common';
import { GroupLimitService } from '../../lib/group-limit.service';
import { AuthModule } from '../auth/auth.module';
import { StripeBillingModule } from '../stripe-billing/stripe-billing.module';
import { TelegramModule } from '../telegram/telegram.module';
import {
  BotStartSettingsController,
  BotStartSettingsInternalController,
} from './bot-start-settings.controller';
import { BotStartSettingsService } from './bot-start-settings.service';

@Module({
  imports: [AuthModule, TelegramModule, forwardRef(() => StripeBillingModule)],
  controllers: [BotStartSettingsController, BotStartSettingsInternalController],
  providers: [BotStartSettingsService, GroupLimitService],
  exports: [BotStartSettingsService],
})
export class BotStartSettingsModule {}
