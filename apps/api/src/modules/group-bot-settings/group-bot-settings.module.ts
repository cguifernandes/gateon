import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  GroupBotSettingsController,
  GroupBotSettingsInternalController,
} from './group-bot-settings.controller';
import { GroupBotSettingsService } from './group-bot-settings.service';

@Module({
  imports: [AuthModule],
  controllers: [GroupBotSettingsController, GroupBotSettingsInternalController],
  providers: [GroupBotSettingsService],
  exports: [GroupBotSettingsService],
})
export class GroupBotSettingsModule {}
