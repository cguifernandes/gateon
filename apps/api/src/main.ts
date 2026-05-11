import { setDefaultResultOrder } from 'node:dns';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  if (
    process.env.GOOGLE_OAUTH_DNS_IPV4_FIRST === 'true' ||
    process.env.GOOGLE_OAUTH_DNS_IPV4_FIRST === '1'
  ) {
    setDefaultResultOrder('ipv4first');
  }

  const app = await NestFactory.create(AppModule);
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
