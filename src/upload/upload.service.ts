import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { UploadResponseDto, ImageSizeDto } from './dto/upload-response.dto';

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
   * @returns Promise containing URLs and metadata for all generated image sizes
   * @throws BadRequestException if file validation or processing fails
   */
  async processAndUploadImage(
    file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    try {
      this.validateFile(file);

      const [thumbnail, medium, large] = await Promise.all([
        this.resizeAndUpload(file.buffer, 'thumbnail', this.sizes.thumbnail),
        this.resizeAndUpload(file.buffer, 'medium', this.sizes.medium),
        this.resizeAndUpload(file.buffer, 'large', this.sizes.large),
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
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new BadRequestException(
        `Image processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Resize an image buffer to specified dimensions, convert to WebP, and upload to Cloudinary
   * @param buffer - The image buffer to process
   * @param sizeName - Name identifier for the size variant (thumbnail, medium, large)
   * @param dimensions - Target width and height for resizing
   * @returns Promise containing URL and metadata for the processed image
   */
  private async resizeAndUpload(
    buffer: Buffer,
    sizeName: string,
    dimensions: { width: number; height: number },
  ): Promise<ImageSizeDto> {
    const processedImage = await sharp(buffer)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toBuffer();

    const metadata = await sharp(processedImage).metadata();

    const uploadResult = await this.uploadToCloudinary(
      processedImage,
      `${sizeName}_${Date.now()}`,
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
   * @returns Promise containing the Cloudinary upload response
   * @throws Error if upload fails or returns no result
   */
  private async uploadToCloudinary(
    buffer: Buffer,
    filename: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'uploads',
          public_id: filename,
          resource_type: 'image',
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
      throw new BadRequestException(
        `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
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

  /**
   * Process and upload multiple image files in parallel
   * @param files - Array of uploaded image files from multer
   * @returns Promise containing an array of upload responses for all files
   */
  async processMultipleImages(
    files: Express.Multer.File[],
  ): Promise<UploadResponseDto[]> {
    const uploadPromises = files.map((file) =>
      this.processAndUploadImage(file),
    );
    return Promise.all(uploadPromises);
  }
}
