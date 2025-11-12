import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('NestJS Starter API')
  .setDescription(
    'A robust NestJS starter template for scalable backend projects with built-in authentication, configuration management, and modular architecture.',
  )
  .setVersion('1.0.0')
  .setContact(
    'Developer Support',
    'https://github.com/yourusername/nestjs-starter',
    'support@yourdomain.com',
  )
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .addServer('http://localhost:3000', 'Development Server')
  .addServer('https://api.yourdomain.com', 'Production Server')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token for authentication',
      in: 'header',
    },
    'JWT-auth',
  )
  .addOAuth2(
    {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://example.com/oauth/authorize',
          tokenUrl: 'https://example.com/oauth/token',
          scopes: {
            'read:data': 'Read access to data',
            'write:data': 'Write access to data',
          },
        },
      },
    },
    'OAuth2',
  )
  .build();
