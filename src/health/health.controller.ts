import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Controller('health')
export class HealthController {
  constructor(private configService: ConfigService) {}

  /**
   * Cloudinary health check
   * @returns Cloudinary connection status and configuration
   */
  @Get('cloudinary')
  async cloudinaryCheck() {
    try {
      await cloudinary.api.ping();

      return {
        status: 'ok',
        service: 'cloudinary',
        connected: true,
        cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        service: 'cloudinary',
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
