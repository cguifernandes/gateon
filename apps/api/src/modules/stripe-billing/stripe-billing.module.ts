import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsModule } from '../alerts/alerts.module';
import { GroupLimitService } from '../../lib/group-limit.service';
import { TelegramModule } from '../telegram/telegram.module';
import { StripeBillingController } from './stripe-billing.controller';
import { StripeBillingSyncService } from './stripe-billing-sync.service';
import { StripeBillingService } from './stripe-billing.service';
import { StripeBillingWebhookController } from './stripe-billing-webhook.controller';
import { StripeBillingWebhookService } from './stripe-billing-webhook.service';

@Module({
  imports: [AuthModule, AlertsModule, TelegramModule],
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
