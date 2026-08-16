import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFeedbackInput } from '../../lib/zod/feedback-schemas';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateFeedbackInput) {
    const feedback = await this.prisma.userFeedback.create({
      data: {
        userId,
        type: input.type,
        rating: input.rating,
        message: input.message,
        sourcePath: input.sourcePath,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return feedback;
  }
}
