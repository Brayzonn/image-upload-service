import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { v2 as cloudinary } from 'cloudinary';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService,
  ) {}

  /**
   * Comprehensive health check including memory, disk, and Cloudinary
   * @returns Health check results for all indicators
   */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
      async () => {
        try {
          await cloudinary.api.ping();
          return {
            cloudinary: {
              status: 'up',
              message: 'Cloudinary connection successful',
            },
          };
        } catch (error) {
          return {
            cloudinary: {
              status: 'down',
              message: error.message,
            },
          };
        }
      },
    ]);
  }

  /**
   * Simple health check returning basic service status
   * @returns Basic service health information
   */
  @Get('simple')
  simpleCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };
  }

  /**
   * Cloudinary-specific health check
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
