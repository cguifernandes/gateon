import { Module } from '@nestjs/common';
import { GroupLimitsModule } from '../group-limits/group-limits.module';
import { AuthModule } from '../auth/auth.module';
import { GroupBotSettingsModule } from '../group-bot-settings/group-bot-settings.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AuthModule, GroupBotSettingsModule, GroupLimitsModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
