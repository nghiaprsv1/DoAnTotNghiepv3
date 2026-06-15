import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UPLOAD_PATH } from './modules/upload/multer.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Match FE which calls /api/* via Vite proxy
  app.setGlobalPrefix('api');

  // CORS
  const origins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Note: ResponseInterceptor + GlobalExceptionFilter + JwtAuthGuard are bound
  // globally via APP_* providers in AppModule — don't double-register here.

  // Static files (uploads)
  app.useStaticAssets(UPLOAD_PATH, { prefix: '/static/' });

  // Swagger
  const swagger = new DocumentBuilder()
    .setTitle('TripMate API')
    .setDescription('Backend for the TravelSocial frontend')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, doc);

  const port = Number(config.get<string>('PORT') ?? 8080);
  // Listen on 0.0.0.0 so the API is reachable from real Android devices on
  // the same Wi-Fi (not just `localhost` on the dev machine).
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🚀 TripMate API on http://localhost:${port}/api · Swagger /docs`);
}

bootstrap();
