import { join } from 'node:path';

// Runs before TLS; `__dirname` is `dist/src` when compiled (not `dist/scripts`).
// eslint-disable-next-line @typescript-eslint/no-require-imports
require(join(__dirname, '../../scripts/load-env.cjs'));

import { setDefaultResultOrder } from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  if (
    process.env.GOOGLE_OAUTH_DNS_IPV4_FIRST === 'true' ||
    process.env.GOOGLE_OAUTH_DNS_IPV4_FIRST === '1'
  ) {
    setDefaultResultOrder('ipv4first');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(cookieParser());
  const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
  app.enableCors({
    origin: webBaseUrl,
    credentials: true,
  });
  app.useGlobalPipes(new ZodValidationPipe());
  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
