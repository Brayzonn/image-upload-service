import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from './common/middleware/activity-logger.middleware';
import { AppController } from '@/app.controller';
import { HealthModule } from '@/health/health.module';
import { UploadModule } from '@/upload/upload.module';
import { DefaultRateLimitMiddleware } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    UploadModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, DefaultRateLimitMiddleware).forRoutes('*');
  }
}
