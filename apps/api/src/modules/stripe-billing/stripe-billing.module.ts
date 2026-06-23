import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsModule } from '../alerts/alerts.module';
import { BotStartSettingsModule } from '../bot-start-settings/bot-start-settings.module';
import { GroupLimitService } from '../../lib/group-limit.service';
import { TelegramModule } from '../telegram/telegram.module';
import {
  StripeBillingController,
  StripeBillingWebhookController,
} from './stripe-billing.controller';
import {
  StripeBillingService,
  StripeBillingSyncService,
  StripeBillingWebhookService,
} from './stripe-billing.service';

@Module({
  imports: [
    AuthModule,
    AlertsModule,
    TelegramModule,
    forwardRef(() => BotStartSettingsModule),
  ],
  controllers: [StripeBillingController, StripeBillingWebhookController],
  providers: [
    StripeBillingService,
    StripeBillingSyncService,
    StripeBillingWebhookService,
    GroupLimitService,
  ],
  exports: [StripeBillingService],
})
export class StripeBillingModule {}
