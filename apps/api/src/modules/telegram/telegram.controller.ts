import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Req,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { telegramBotEventSchema } from './schemas/telegram-schemas';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Get('groups')
  @UseGuards(AuthGuard)
  listGroups(@Req() req: Request) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }

    return this.telegram.listGroups(userId);
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
}
