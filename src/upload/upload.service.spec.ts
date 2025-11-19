import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { Writable } from 'stream';

jest.mock('cloudinary');
jest.mock('sharp');

describe('UploadService', () => {
  let service: UploadService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        MAX_FILE_SIZE: 5242880,
        ALLOWED_MIME_TYPES: 'image/jpeg,image/png,image/jpg,image/webp',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'image',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024000,
    buffer: Buffer.from('fake-image-data'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  const mockSharpInstance = {
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
    metadata: jest.fn().mockResolvedValue({
      width: 150,
      height: 150,
      format: 'webp',
    }),
  };

  const mockCloudinaryResult = {
    public_id: 'uploads/test_image_123',
    secure_url:
      'https://res.cloudinary.com/test/image/upload/v123/uploads/test_image_123.webp',
    width: 150,
    height: 150,
    format: 'webp',
    bytes: 8456,
  };

  const createMockUploadStream = (
    callback: (error: any, result: any) => void,
  ) => {
    const mockStream = new Writable({
      write(chunk, encoding, cb) {
        cb();
      },
    });

    setTimeout(() => callback(null, mockCloudinaryResult), 0);

    return mockStream;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();

    (sharp as any).mockImplementation(() => mockSharpInstance);

    (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
      (options, callback) => createMockUploadStream(callback),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have predefined image sizes', () => {
      expect(service['sizes']).toEqual({
        thumbnail: { width: 150, height: 150 },
        medium: { width: 500, height: 500 },
        large: { width: 1200, height: 1200 },
      });
    });
  });

  describe('processAndUploadImage', () => {
    it('should successfully process and upload a single image', async () => {
      const result = await service.processAndUploadImage(mockFile, {
        userId: 'user123',
        category: 'profile',
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('message', 'Image uploaded successfully');
      expect(result.original).toEqual({
        filename: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024000,
      });
      expect(result.images).toHaveProperty('thumbnail');
      expect(result.images).toHaveProperty('medium');
      expect(result.images).toHaveProperty('large');
      expect(result.metadata).toEqual({
        userId: 'user123',
        category: 'profile',
        description: undefined,
        folder: 'uploads/profile/user123',
      });
    });

    it('should process image without userId and category', async () => {
      const result = await service.processAndUploadImage(mockFile, {});

      expect(result.metadata.folder).toBe('uploads');
      expect(result.success).toBe(true);
    });

    it('should process image with custom folder', async () => {
      const result = await service.processAndUploadImage(mockFile, {
        folder: 'custom/path',
      });

      expect(result.metadata.folder).toBe('custom/path');
    });

    it('should call sharp with correct parameters', async () => {
      await service.processAndUploadImage(mockFile, {});

      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockSharpInstance.resize).toHaveBeenCalled();
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 85 });
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
    });

    it('should process all three sizes in parallel', async () => {
      const result = await service.processAndUploadImage(mockFile, {});

      expect(sharp).toHaveBeenCalledTimes(7);

      expect(result.images.thumbnail).toBeDefined();
      expect(result.images.medium).toBeDefined();
      expect(result.images.large).toBeDefined();

      expect(mockSharpInstance.resize).toHaveBeenCalledTimes(3);
      expect(mockSharpInstance.webp).toHaveBeenCalledTimes(3);
      expect(mockSharpInstance.toBuffer).toHaveBeenCalledTimes(3);
    });

    it('should throw BadRequestException on processing failure', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(
        new Error('Processing failed'),
      );

      await expect(service.processAndUploadImage(mockFile, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processMultipleImages', () => {
    const multipleFiles: Express.Multer.File[] = [
      { ...mockFile, originalname: 'image1.jpg' },
      { ...mockFile, originalname: 'image2.jpg' },
      { ...mockFile, originalname: 'image3.jpg' },
    ];

    it('should successfully process multiple images', async () => {
      const results = await service.processMultipleImages(multipleFiles, {
        userId: 'user123',
      });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it('should throw error when no files provided', async () => {
      await expect(service.processMultipleImages([], {})).rejects.toThrow(
        'No files uploaded',
      );
    });

    it('should throw error when files array is null', async () => {
      await expect(
        service.processMultipleImages(null as any, {}),
      ).rejects.toThrow('No files uploaded');
    });

    it('should throw error when more than 10 files', async () => {
      const tooManyFiles = Array(11).fill(mockFile);

      await expect(
        service.processMultipleImages(tooManyFiles, {}),
      ).rejects.toThrow('Maximum 10 files allowed');
    });

    it('should process all files in parallel', async () => {
      const startTime = Date.now();
      await service.processMultipleImages(multipleFiles, {});
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('validateFile', () => {
    it('should pass validation for valid file', () => {
      expect(() => service['validateFile'](mockFile)).not.toThrow();
    });

    it('should throw error when file is null', () => {
      expect(() => service['validateFile'](null as any)).toThrow(
        'No file uploaded',
      );
    });

    it('should throw error when file is undefined', () => {
      expect(() => service['validateFile'](undefined as any)).toThrow(
        'No file uploaded',
      );
    });

    it('should throw error when file is too large', () => {
      const largeFile = { ...mockFile, size: 10485760 };

      expect(() => service['validateFile'](largeFile)).toThrow(
        'File too large. Maximum size is 5MB',
      );
    });

    it('should throw error for invalid mime type', () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };

      expect(() => service['validateFile'](invalidFile)).toThrow(
        'Invalid file type',
      );
    });

    it('should accept all allowed mime types', () => {
      const mimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

      mimeTypes.forEach((mimetype) => {
        const file = { ...mockFile, mimetype };
        expect(() => service['validateFile'](file)).not.toThrow();
      });
    });
  });

  describe('determineFolder', () => {
    it('should return custom folder when provided', () => {
      const folder = service['determineFolder']({ folder: 'custom/path' });
      expect(folder).toBe('custom/path');
    });

    it('should return category/userId folder when both provided', () => {
      const folder = service['determineFolder']({
        userId: 'user123',
        category: 'profile',
      });
      expect(folder).toBe('uploads/profile/user123');
    });

    it('should return users/userId folder when only userId provided', () => {
      const folder = service['determineFolder']({ userId: 'user123' });
      expect(folder).toBe('uploads/users/user123');
    });

    it('should return category folder when only category provided', () => {
      const folder = service['determineFolder']({ category: 'products' });
      expect(folder).toBe('uploads/products');
    });

    it('should return default uploads folder when no options', () => {
      const folder = service['determineFolder']({});
      expect(folder).toBe('uploads');
    });

    it('should prioritize custom folder over userId and category', () => {
      const folder = service['determineFolder']({
        folder: 'custom',
        userId: 'user123',
        category: 'profile',
      });
      expect(folder).toBe('custom');
    });
  });

  describe('buildFilenamePrefix', () => {
    it('should build prefix with userId and category', () => {
      const prefix = service['buildFilenamePrefix']({
        userId: 'user123',
        category: 'profile',
      });
      expect(prefix).toBe('user123_profile');
    });

    it('should build prefix with only userId', () => {
      const prefix = service['buildFilenamePrefix']({ userId: 'user123' });
      expect(prefix).toBe('user123');
    });

    it('should build prefix with only category', () => {
      const prefix = service['buildFilenamePrefix']({ category: 'products' });
      expect(prefix).toBe('products');
    });

    it('should return default "image" when no options', () => {
      const prefix = service['buildFilenamePrefix']({});
      expect(prefix).toBe('image');
    });
  });

  describe('extractMetadata', () => {
    it('should extract all metadata fields', () => {
      const metadata = service['extractMetadata']({
        userId: 'user123',
        category: 'profile',
        description: 'Test description',
      });

      expect(metadata).toEqual({
        userId: 'user123',
        category: 'profile',
        description: 'Test description',
        folder: 'uploads/profile/user123',
      });
    });

    it('should handle missing optional fields', () => {
      const metadata = service['extractMetadata']({});

      expect(metadata).toEqual({
        userId: undefined,
        category: undefined,
        description: undefined,
        folder: 'uploads',
      });
    });
  });

  describe('deleteImage', () => {
    beforeEach(() => {
      (cloudinary.uploader.destroy as jest.Mock) = jest
        .fn()
        .mockResolvedValue({ result: 'ok' });
    });

    it('should successfully delete an image', async () => {
      const result = await service.deleteImage('uploads/test_image_123');

      expect(result).toEqual({
        success: true,
        message: 'Image deleted successfully',
      });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'uploads/test_image_123',
      );
    });

    it('should throw error when publicId is empty', async () => {
      await expect(service.deleteImage('')).rejects.toThrow(
        'Public ID is required',
      );
    });

    it('should throw error when publicId is null', async () => {
      await expect(service.deleteImage(null as any)).rejects.toThrow(
        'Public ID is required',
      );
    });

    it('should throw error when deletion fails', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValueOnce({
        result: 'not found',
      });

      await expect(
        service.deleteImage('uploads/test_image_123'),
      ).rejects.toThrow('Failed to delete image');
    });

    it('should handle cloudinary errors', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      await expect(
        service.deleteImage('uploads/test_image_123'),
      ).rejects.toThrow('Delete failed: Network error');
    });
  });

  describe('uploadToCloudinary', () => {
    it('should successfully upload to cloudinary', async () => {
      const buffer = Buffer.from('test-image');
      const filename = 'test_thumbnail_123';
      const folder = 'uploads/test';

      const result = await service['uploadToCloudinary'](
        buffer,
        filename,
        folder,
      );

      expect(result).toEqual(mockCloudinaryResult);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        {
          folder: 'uploads/test',
          public_id: 'test_thumbnail_123',
          resource_type: 'image',
          type: 'upload',
        },
        expect.any(Function),
      );
    });

    it('should handle upload errors', async () => {
      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          const errorStream = createMockUploadStream((error, result) => {
            callback(new Error('Upload failed'), null);
          });
          setTimeout(() => callback(new Error('Upload failed'), null), 0);
          return errorStream;
        },
      );

      const buffer = Buffer.from('test-image');

      await expect(
        service['uploadToCloudinary'](buffer, 'test', 'uploads'),
      ).rejects.toThrow('Upload failed');
    });

    it('should handle no result scenario', async () => {
      (cloudinary.uploader.upload_stream as jest.Mock) = jest.fn(
        (options, callback) => {
          const errorStream = createMockUploadStream((error, result) => {
            callback(null, null);
          });
          setTimeout(() => callback(null, null), 0);
          return errorStream;
        },
      );

      const buffer = Buffer.from('test-image');

      await expect(
        service['uploadToCloudinary'](buffer, 'test', 'uploads'),
      ).rejects.toThrow('Upload failed: No result returned from Cloudinary');
    });
  });
});
