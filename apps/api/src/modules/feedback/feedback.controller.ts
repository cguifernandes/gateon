import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthGuard } from '../../lib/guards/auth.guard';
import { FeedbackService } from './feedback.service';
import { createFeedbackSchema } from '../../lib/zod/feedback-schemas';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@Req() req: Request, @Body() body: unknown) {
    const input = createFeedbackSchema.parse(body);
    return this.feedback.create(this.getUserId(req), input);
  }

  private getUserId(req: Request) {
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return userId;
  }
}
