import { Module } from '@nestjs/common';
import { GroupLimitService } from '../../lib/group-limit.service';
import { AuthModule } from '../auth/auth.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AuthModule],
  controllers: [TelegramController],
  providers: [TelegramService, GroupLimitService],
})
export class TelegramModule {}
