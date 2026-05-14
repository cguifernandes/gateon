import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AuthModule],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
