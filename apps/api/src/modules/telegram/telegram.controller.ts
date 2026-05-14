import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
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
