import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupLimitsModule } from '../group-limits/group-limits.module';
import { TelegramModule } from '../telegram/telegram.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [AuthModule, GroupLimitsModule, TelegramModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
