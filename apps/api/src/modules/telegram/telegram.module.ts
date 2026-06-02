import { Module } from '@nestjs/common';
import { GroupLimitService } from '../../lib/group-limit.service';
import { AuthModule } from '../auth/auth.module';
import { GroupBotSettingsModule } from '../group-bot-settings/group-bot-settings.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AuthModule, GroupBotSettingsModule],
  controllers: [TelegramController],
  providers: [TelegramService, GroupLimitService],
  exports: [TelegramService],
})
export class TelegramModule {}
