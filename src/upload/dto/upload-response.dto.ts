export class ImageSizeDto {
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export class UploadResponseDto {
  success: boolean;
  message: string;
  original: {
    filename: string;
    mimetype: string;
    size: number;
  };
  images: {
    thumbnail: ImageSizeDto;
    medium: ImageSizeDto;
    large: ImageSizeDto;
  };
  uploadedAt: Date;
}
