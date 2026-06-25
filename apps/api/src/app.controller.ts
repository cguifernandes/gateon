import { Controller, Get, NotFoundException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  buildEnvConfigSnapshot,
  isEnvDebugEnabled,
} from './lib/env-config-snapshot';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @SkipThrottle()
  health(): { ok: true } {
    return { ok: true };
  }

  @Get('debug/env')
  @SkipThrottle()
  debugEnv(): {
    app: 'api';
    nodeEnv: string | undefined;
    enabled: true;
    masked: true;
    variables: ReturnType<typeof buildEnvConfigSnapshot>;
  } {
    if (!isEnvDebugEnabled()) {
      throw new NotFoundException();
    }

    return {
      app: 'api',
      nodeEnv: process.env.NODE_ENV,
      enabled: true,
      masked: true,
      variables: buildEnvConfigSnapshot(),
    };
  }
}
