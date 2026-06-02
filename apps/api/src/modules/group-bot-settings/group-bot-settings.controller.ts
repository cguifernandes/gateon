import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GroupBotSettingsService } from './group-bot-settings.service';
import { telegramGroupBotSettingsPatchSchema } from './schemas/group-bot-settings-schemas';

@Controller('telegram/groups')
export class GroupBotSettingsController {
  constructor(private readonly groupBotSettings: GroupBotSettingsService) {}

  @Get(':groupId/bot-settings')
  @UseGuards(AuthGuard)
  getGroupBotSettings(@Req() req: Request, @Param('groupId') groupId: string) {
    return this.groupBotSettings.getForGroup(this.getUserId(req), groupId);
  }

  @Patch(':groupId/bot-settings')
  @UseGuards(AuthGuard)
  updateGroupBotSettings(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const input = telegramGroupBotSettingsPatchSchema.parse(body);
    return this.groupBotSettings.updateForGroup(
      this.getUserId(req),
      groupId,
      input,
    );
  }

  private getUserId(req: Request) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return userId;
  }
}

@Controller('telegram/internal/groups')
export class GroupBotSettingsInternalController {
  constructor(private readonly groupBotSettings: GroupBotSettingsService) {}

  @Get(':telegramChatId/bot-settings')
  getInternalGroupBotSettings(
    @Headers('x-gateon-bot-secret') botSecret: string | undefined,
    @Param('telegramChatId') telegramChatId: string,
  ) {
    if (!this.groupBotSettings.isInternalSecretValid(botSecret)) {
      throw new UnauthorizedException();
    }

    return this.groupBotSettings.getInternalByChatId(telegramChatId);
  }
}
