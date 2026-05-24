import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { telegramGroupBotSettingsPatchSchema } from '../../lib/zod/telegram-group-bot-settings-schemas';
import { telegramGroupChatNoticeRequestSchema } from '../../lib/zod/telegram-group-chat-notice-schemas';
import { telegramGroupMemberBulkActionSchema } from '../../lib/zod/telegram-member-actions-schemas';
import { telegramBotEventSchema } from './schemas/telegram-schemas';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Get('groups')
  @UseGuards(AuthGuard)
  listGroups(@Req() req: Request, @Query('view') view?: string) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    if (view === 'members') {
      return this.telegram.listGroupsForMembersView(userId);
    }

    return this.telegram.listGroups(userId);
  }

  @Get('groups/:groupId')
  @UseGuards(AuthGuard)
  getGroup(@Req() req: Request, @Param('groupId') groupId: string) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.telegram.getGroup(userId, groupId);
  }

  @Get('groups/:groupId/bot-settings')
  @UseGuards(AuthGuard)
  getGroupBotSettings(@Req() req: Request, @Param('groupId') groupId: string) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.telegram.getGroupBotSettings(userId, groupId);
  }

  @Patch('groups/:groupId/bot-settings')
  @UseGuards(AuthGuard)
  updateGroupBotSettings(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const input = telegramGroupBotSettingsPatchSchema.parse(body);
    return this.telegram.updateGroupBotSettings(userId, groupId, input);
  }

  @Post('groups/:groupId/members/actions')
  @UseGuards(AuthGuard)
  performGroupMemberActions(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const input = telegramGroupMemberBulkActionSchema.parse(body);
    return this.telegram.performGroupMemberActions(userId, groupId, input);
  }

  @Post('groups/:groupId/chat-notice')
  @UseGuards(AuthGuard)
  sendGroupChatNotice(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Body() body: unknown,
  ) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const input = telegramGroupChatNoticeRequestSchema.parse(body);
    return this.telegram.sendGroupChatNotice(userId, groupId, input);
  }

  @Get('groups/:groupId/members')
  @UseGuards(AuthGuard)
  listGroupMembers(@Req() req: Request, @Param('groupId') groupId: string) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.telegram.listGroupMembers(userId, groupId);
  }

  @Post('groups/:groupId/refresh')
  @UseGuards(AuthGuard)
  refreshGroup(@Req() req: Request, @Param('groupId') groupId: string) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.telegram.refreshGroupConnection(userId, groupId);
  }

  @Get('groups/:groupId/chat-photo')
  @UseGuards(AuthGuard)
  async getGroupChatPhoto(
    @Req() req: Request,
    @Param('groupId') groupId: string,
  ): Promise<StreamableFile> {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const file = await this.telegram.getGroupChatPhotoFile(userId, groupId);
    if (!file) {
      throw new NotFoundException();
    }

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: 'inline',
    });
  }

  @Get('groups/:groupId/connector-profile-photo')
  @UseGuards(AuthGuard)
  async getConnectorProfilePhoto(
    @Req() req: Request,
    @Param('groupId') groupId: string,
  ): Promise<StreamableFile> {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const file = await this.telegram.getGroupConnectorProfilePhotoFile(
      userId,
      groupId,
    );
    if (!file) {
      throw new NotFoundException();
    }

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: 'inline',
    });
  }

  @Get('groups/:groupId/members/:telegramUserId/profile-photo')
  @UseGuards(AuthGuard)
  async getGroupMemberProfilePhoto(
    @Req() req: Request,
    @Param('groupId') groupId: string,
    @Param('telegramUserId') telegramUserId: string,
  ): Promise<StreamableFile> {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const file = await this.telegram.getGroupMemberProfilePhotoFile(
      userId,
      groupId,
      telegramUserId,
    );
    if (!file) {
      throw new NotFoundException();
    }

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: 'inline',
    });
  }

  @Delete('groups/:groupId')
  @UseGuards(AuthGuard)
  removeGroup(@Req() req: Request, @Param('groupId') groupId: string) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.telegram.removeGroupConnection(userId, groupId);
  }

  @Post('group-connections/start')
  @UseGuards(AuthGuard)
  startGroupConnection(@Req() req: Request) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.telegram.startGroupConnection(userId);
  }

  @Get('group-connections/:intentId')
  @UseGuards(AuthGuard)
  getGroupConnectionStatus(
    @Req() req: Request,
    @Param('intentId') intentId: string,
  ) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.telegram.getGroupConnectionStatus(userId, intentId);
  }

  @Post('group-connections/events')
  handleBotEvent(
    @Headers('x-gateon-bot-secret') botSecret: string | undefined,
    @Body() body: unknown,
  ) {
    if (!this.telegram.isInternalSecretValid(botSecret)) {
      throw new UnauthorizedException();
    }

    const input = telegramBotEventSchema.parse(body);
    return this.telegram.handleBotEvent(input);
  }

  @Get('internal/groups/:telegramChatId/bot-settings')
  getInternalGroupBotSettings(
    @Headers('x-gateon-bot-secret') botSecret: string | undefined,
    @Param('telegramChatId') telegramChatId: string,
  ) {
    if (!this.telegram.isInternalSecretValid(botSecret)) {
      throw new UnauthorizedException();
    }

    return this.telegram.getInternalGroupBotSettings(telegramChatId);
  }
}
