import { INestApplication, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export function createSwaggerConfig(port: number) {
  return new DocumentBuilder()
    .setTitle('Image Upload & Optimization API')
    .setDescription(
      'Upload, resize, optimize, and store images with automatic WebP conversion. ' +
        'Generates thumbnail (150x150), medium (500x500), and large (1200x1200) versions.',
    )
    .setVersion('1.0.0')
    .setContact(
      'Developer Support',
      'https://github.com/brayzonn/image-upload-service',
      'support@yourdomain.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(`http://localhost:${port}`, 'Development Server')
    .addServer('https://api.yourdomain.com', 'Production Server')
    .addTag('upload', 'Image upload and processing endpoints')
    .addTag('health', 'Health check endpoints')
    .build();
}

export function setupSwagger(
  app: INestApplication,
  port: number,
  logger: Logger,
): void {
  const config = createSwaggerConfig(port);
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: false,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Image Upload API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
