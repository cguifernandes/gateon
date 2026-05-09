import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
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
