import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('API Info')
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({
    status: 200,
    description: 'API information retrieved successfully',
  })
  getApiInfo() {
    return {
      name: 'Image Upload & Optimization API',
      version: '1.0.0',
      description:
        'Upload, resize, and optimize images with automatic WebP conversion and cloud storage',
      documentation: '/api/docs',
      endpoints: {
        uploadSingle: '/upload/image',
        uploadMultiple: '/upload/images',
        deleteImage: '/upload/image',
      },
      features: [
        'Multi-size image generation (thumbnail, medium, large)',
        'Automatic WebP conversion',
        'Cloudinary CDN integration',
        'Parallel processing',
        'File validation',
      ],
      limits: {
        maxFileSize: this.configService.get<string>('MAX_FILE_SIZE', '5MB'),
        maxFiles: 10,
        supportedFormats: this.configService
          .get<string>('ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/webp')
          .split(',')
          .map((type) => type.replace('image/', '').toUpperCase()),
      },
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
    };
  }
}
