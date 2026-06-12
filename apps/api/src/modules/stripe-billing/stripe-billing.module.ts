import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlertsModule } from '../alerts/alerts.module';
import { StripeBillingController } from './stripe-billing.controller';
import { StripeBillingSyncService } from './stripe-billing-sync.service';
import { StripeBillingService } from './stripe-billing.service';

@Module({
  imports: [AuthModule, AlertsModule],
  controllers: [StripeBillingController],
  providers: [StripeBillingService, StripeBillingSyncService],
  exports: [StripeBillingService],
})
export class StripeBillingModule {}
