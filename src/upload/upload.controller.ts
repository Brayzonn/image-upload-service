import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from '@/upload/upload.service';
import { UploadResponseDto } from '@/upload//dto/upload-response.dto';
import { UploadImageDto } from '@/upload/interfaces/upload-image.dto';

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
    @Body() uploadDto: UploadImageDto,
  ): Promise<UploadResponseDto> {
    return this.uploadService.processAndUploadImage(file, uploadDto);
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
    @Body() uploadDto: UploadImageDto,
  ): Promise<UploadResponseDto[]> {
    return this.uploadService.processMultipleImages(files, uploadDto);
  }

  @Delete('image')
  async deleteImage(@Body('publicId') publicId: string) {
    return this.uploadService.deleteImage(publicId);
  }
}
