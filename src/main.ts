import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@/app.module';
import { createCorsConfig } from '@/config/cors.config';
import { setupHelmetAndCompression } from '@/config/helmet-compression.config';
import { validationPipeOptions } from '@/config/validation.config';
import { setupRequestSizeLimit } from '@/config/request-size.config';
import { setupSessionAndCookies } from '@/config/session.config';
import { RedisService } from '@/redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  const redisService = app.get(RedisService);

  setupRequestSizeLimit(app, configService);
  setupSessionAndCookies(app, configService, redisService);
  setupHelmetAndCompression(app);
  app.enableCors(createCorsConfig(configService));
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  await app.listen(parseInt(configService.get('PORT', '3000')));
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger docs available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
