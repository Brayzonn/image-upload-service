import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadSingleImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5242880 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|jpg|png|webp)/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.uploadService.processAndUploadImage(file);
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadMultipleImages(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5242880 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|jpg|png|webp)/ }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed');
    }

    return this.uploadService.processMultipleImages(files);
  }

  @Delete('image')
  async deleteImage(@Body('publicId') publicId: string) {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }
    return this.uploadService.deleteImage(publicId);
  }
}
