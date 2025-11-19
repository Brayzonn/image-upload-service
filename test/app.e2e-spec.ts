import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '@/app.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';

type SupertestResponse = Response & { body: any };

describe('Image Upload API (e2e)', () => {
  let app: INestApplication;

  const createTestImage = (): Buffer => {
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Root Endpoint', () => {
    it('GET / should return API information', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('name');
          expect(res.body.data).toHaveProperty('version');
          expect(res.body.data).toHaveProperty('endpoints');
          expect(res.body.data.name).toBe('Image Upload & Optimization API');
        });
    });
  });

  describe('Health Check', () => {
    it('GET /health/cloudinary should return connection status', () => {
      return request(app.getHttpServer())
        .get('/api/health/cloudinary')
        .expect(200)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('status');
          expect(res.body.data).toHaveProperty('service', 'cloudinary');
          expect(res.body.data).toHaveProperty('connected');
        });
    });
  });

  describe('Upload Single Image', () => {
    it('POST /upload/image should upload successfully', () => {
      return request(app.getHttpServer())
        .post('/api/upload/image')
        .attach('image', createTestImage(), 'test.png')
        .field('userId', 'test-user-123')
        .field('category', 'test')
        .expect(201)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.success).toBe(true);
          expect(res.body.data.message).toBe('Image uploaded successfully');
          expect(res.body.data.images).toHaveProperty('thumbnail');
          expect(res.body.data.images).toHaveProperty('medium');
          expect(res.body.data.images).toHaveProperty('large');
          expect(res.body.data.images.thumbnail).toHaveProperty('url');
          expect(res.body.data.images.thumbnail).toHaveProperty('width', 150);
          expect(res.body.data.images.thumbnail).toHaveProperty('height', 150);
          expect(res.body.data.metadata).toHaveProperty(
            'userId',
            'test-user-123',
          );
          expect(res.body.data.metadata).toHaveProperty('category', 'test');
        });
    }, 30000);

    it('POST /upload/image should work without optional fields', () => {
      return request(app.getHttpServer())
        .post('/api/upload/image')
        .attach('image', createTestImage(), 'test.png')
        .expect(201)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.metadata.folder).toBe('uploads');
        });
    }, 30000);

    it('POST /upload/image should reject missing file', () => {
      return request(app.getHttpServer())
        .post('/api/upload/image')
        .field('userId', 'test-user-123')
        .expect(400)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('File is required');
        });
    });

    it('POST /upload/image should reject file too large', () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      return request(app.getHttpServer())
        .post('/api/upload/image')
        .attach('image', largeBuffer, 'large.png')
        .expect(400)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('File size exceeds');
        });
    });

    it('POST /upload/image should reject invalid file type', () => {
      const txtBuffer = Buffer.from('This is a text file');

      return request(app.getHttpServer())
        .post('/api/upload/image')
        .attach('image', txtBuffer, 'test.txt')
        .set('Content-Type', 'text/plain')
        .expect(400);
    });
  });

  describe('Upload Multiple Images', () => {
    it('POST /upload/images should upload multiple images', () => {
      return request(app.getHttpServer())
        .post('/api/upload/images')
        .attach('images', createTestImage(), 'test1.png')
        .attach('images', createTestImage(), 'test2.png')
        .attach('images', createTestImage(), 'test3.png')
        .field('userId', 'test-user-123')
        .field('category', 'batch-test')
        .expect(201)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data).toHaveLength(3);
          expect(res.body.data[0].success).toBe(true);
          expect(res.body.data[1].success).toBe(true);
          expect(res.body.data[2].success).toBe(true);
        });
    }, 60000);

    it('POST /upload/images should reject no files', () => {
      return request(app.getHttpServer())
        .post('/api/upload/images')
        .field('userId', 'test-user-123')
        .expect(400)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('No files uploaded');
        });
    });

    it('POST /upload/images should reject more than 10 files', () => {
      const req = request(app.getHttpServer()).post('/api/upload/images');

      for (let i = 0; i < 11; i++) {
        req.attach('images', createTestImage(), `test${i}.png`);
      }

      return req.expect(400).expect((res: SupertestResponse) => {
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Maximum 10 files allowed');
      });
    });
  });

  describe('Delete Image', () => {
    let publicIdToDelete: string;

    beforeAll(async () => {
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/upload/image')
        .attach('image', createTestImage(), 'delete-test.png')
        .field('userId', 'delete-test-user');

      const url = uploadResponse.body.data.images.thumbnail.url;
      const urlParts = url.split('/');
      const fileWithExt = urlParts[urlParts.length - 1];
      const fileName = fileWithExt.split('.')[0];
      publicIdToDelete = `uploads/users/delete-test-user/${fileName}`;
    });

    it('DELETE /upload/image should delete successfully', () => {
      return request(app.getHttpServer())
        .delete('/api/upload/image')
        .send({ publicId: publicIdToDelete })
        .expect(200)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.success).toBe(true);
          expect(res.body.data.message).toBe('Image deleted successfully');
        });
    });

    it('DELETE /upload/image should reject missing publicId', () => {
      return request(app.getHttpServer())
        .delete('/api/upload/image')
        .send({})
        .expect(400)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Public ID is required');
        });
    });

    it('DELETE /upload/image should handle non-existent publicId', () => {
      return request(app.getHttpServer())
        .delete('/api/upload/image')
        .send({ publicId: 'non-existent-image-id' })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      const requests: Promise<number>[] = [];

      for (let i = 0; i < 21; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/api')
            .then((res) => res.status),
        );
      }

      const results = await Promise.all(requests);

      const rateLimited = results.filter((status) => status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', () => {
      return request(app.getHttpServer())
        .get('/api/non-existent-route')
        .expect(404)
        .expect((res: SupertestResponse) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('should handle malformed JSON', () => {
      return request(app.getHttpServer())
        .delete('/api/upload/image')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });
});
