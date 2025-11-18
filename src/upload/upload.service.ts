import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { UploadResponseDto, ImageSizeDto } from './dto/upload-response.dto';
import {
  UploadOptions,
  UploadMetadata,
} from './interfaces/upload-options.interface';

@Injectable()
export class UploadService {
  private readonly sizes = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 500, height: 500 },
    large: { width: 1200, height: 1200 },
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Process and upload a single image file
   * Validates the file, resizes it to multiple dimensions, converts to WebP, and uploads to Cloudinary
   * @param file - The uploaded image file from multer
   * @param options - Upload configuration options
   * @returns Promise containing URLs and metadata for all generated image sizes
   * @throws BadRequestException if file validation or processing fails
   */
  async processAndUploadImage(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResponseDto> {
    try {
      this.validateFile(file);

      const folder = this.determineFolder(options);
      const filenamePrefix = this.buildFilenamePrefix(options);

      const [thumbnail, medium, large] = await Promise.all([
        this.resizeAndUpload(
          file.buffer,
          'thumbnail',
          this.sizes.thumbnail,
          folder,
          filenamePrefix,
        ),
        this.resizeAndUpload(
          file.buffer,
          'medium',
          this.sizes.medium,
          folder,
          filenamePrefix,
        ),
        this.resizeAndUpload(
          file.buffer,
          'large',
          this.sizes.large,
          folder,
          filenamePrefix,
        ),
      ]);

      return {
        success: true,
        message: 'Image uploaded successfully',
        original: {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        images: {
          thumbnail,
          medium,
          large,
        },
        metadata: this.extractMetadata(options),
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new BadRequestException(
        `Image processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Process and upload multiple image files in parallel
   * @param files - Array of uploaded image files from multer
   * @param options - Upload configuration options
   * @returns Promise containing an array of upload responses for all files
   */
  async processMultipleImages(
    files: Express.Multer.File[],
    options: UploadOptions = {},
  ): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed');
    }

    const uploadPromises = files.map((file) =>
      this.processAndUploadImage(file, options),
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Resize an image buffer to specified dimensions, convert to WebP, and upload to Cloudinary
   * @param buffer - The image buffer to process
   * @param sizeName - Name identifier for the size variant
   * @param dimensions - Target width and height for resizing
   * @param folder - Cloudinary folder path
   * @param filenamePrefix - Prefix for the filename
   * @returns Promise containing URL and metadata for the processed image
   */
  private async resizeAndUpload(
    buffer: Buffer,
    sizeName: string,
    dimensions: { width: number; height: number },
    folder: string,
    filenamePrefix: string,
  ): Promise<ImageSizeDto> {
    const processedImage = await sharp(buffer)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toBuffer();

    const metadata = await sharp(processedImage).metadata();

    const filename = `${filenamePrefix}_${sizeName}_${Date.now()}`;

    const uploadResult = await this.uploadToCloudinary(
      processedImage,
      filename,
      folder,
    );

    return {
      url: uploadResult.secure_url,
      width: metadata.width ?? dimensions.width,
      height: metadata.height ?? dimensions.height,
      size: processedImage.length,
      format: 'webp',
    };
  }

  /**
   * Upload an image buffer to Cloudinary using stream upload
   * @param buffer - The image buffer to upload
   * @param filename - The public ID to use for the uploaded file
   * @param folder - Cloudinary folder path
   * @returns Promise containing the Cloudinary upload response
   * @throws Error if upload fails or returns no result
   */
  private async uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          public_id: filename,
          resource_type: 'image',
          type: 'upload',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(
              new Error('Upload failed: No result returned from Cloudinary'),
            );
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Determine the Cloudinary folder path based on options
   * @param options - Upload options
   * @returns Folder path string
   */
  private determineFolder(options: UploadOptions): string {
    if (options.folder) {
      return options.folder;
    }

    if (options.userId && options.category) {
      return `uploads/${options.category}/${options.userId}`;
    }

    if (options.userId) {
      return `uploads/users/${options.userId}`;
    }

    if (options.category) {
      return `uploads/${options.category}`;
    }

    return 'uploads';
  }

  /**
   * Build filename prefix based on options
   * @param options - Upload options
   * @returns Filename prefix
   */
  private buildFilenamePrefix(options: UploadOptions): string {
    const parts: string[] = [];

    if (options.userId) {
      parts.push(options.userId);
    }

    if (options.category) {
      parts.push(options.category);
    }

    return parts.length > 0 ? parts.join('_') : 'image';
  }

  /**
   * Extract metadata from upload options
   * @param options - Upload options
   * @returns Metadata object
   */
  private extractMetadata(options: UploadOptions): UploadMetadata {
    return {
      userId: options.userId,
      category: options.category,
      description: options.description,
      folder: this.determineFolder(options),
    };
  }

  /**
   * Validate uploaded file for type, size, and integrity
   * @param file - The uploaded file to validate
   * @throws BadRequestException if validation fails
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const maxSize = this.configService.get<number>('MAX_FILE_SIZE', 5242880);

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(
        `File too large. Maximum size is ${maxSizeMB}MB`,
      );
    }

    const allowedMimeTypes = this.configService
      .get<string>('ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/jpg')
      .split(',');

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }

    sharp(file.buffer)
      .metadata()
      .catch(() => {
        throw new BadRequestException('Invalid image file');
      });
  }

  /**
   * Delete an image from Cloudinary by its public ID
   * @param publicId - The Cloudinary public ID of the image to delete
   * @returns Promise containing success status and message
   * @throws BadRequestException if deletion fails
   */
  async deleteImage(
    publicId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!publicId) {
        throw new BadRequestException('Public ID is required');
      }

      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        return {
          success: true,
          message: 'Image deleted successfully',
        };
      } else {
        throw new BadRequestException('Failed to delete image');
      }
    } catch (error) {
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }
}
