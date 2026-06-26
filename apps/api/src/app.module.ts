import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuthModule } from './modules/auth/auth.module';
import { BotStartSettingsModule } from './modules/bot-start-settings/bot-start-settings.module';
import { GroupBotSettingsModule } from './modules/group-bot-settings/group-bot-settings.module';
import { GroupLimitsModule } from './modules/group-limits/group-limits.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StripeBillingModule } from './modules/stripe-billing/stripe-billing.module';
import { TelegramModule } from './modules/telegram/telegram.module';

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: readPositiveIntegerEnv('RATE_LIMIT_TTL_MS', 60_000),
        limit: readPositiveIntegerEnv('RATE_LIMIT_MAX_REQUESTS', 120),
      },
    ]),
    PrismaModule,
    GroupLimitsModule,
    AuthModule,
    TelegramModule,
    GroupBotSettingsModule,
    BotStartSettingsModule,
    AlertsModule,
    StripeBillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
