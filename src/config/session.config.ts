import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import { RedisService } from '@/redis/redis.service';

export function setupSessionAndCookies(
  app: INestApplication,
  configService: ConfigService,
  redisService: RedisService,
): void {
  const cookieSecret = configService.get<string>(
    'COOKIE_SECRET',
    'your-cookie-secret',
  );
  const sessionSecret = configService.get<string>(
    'SESSION_SECRET',
    'your-session-secret',
  );
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  app.use(cookieParser(cookieSecret));

  const sessionConfig: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: nodeEnv === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2,
      sameSite: nodeEnv === 'production' ? 'none' : 'lax',
    },
    name: 'serverSessionID',
  };

  sessionConfig.store = new RedisStore({
    client: redisService.getClient(),
    prefix: 'testapp:sess:',
    ttl: 7200,
  });

  app.use(session(sessionConfig));
}
