![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

# Image Upload & Optimization Pipeline

An image processing API built with NestJS that handles image uploads, optimization, and cloud storage.

## Features

- **Single & Multiple Image Uploads** - Handle one or many images at once
- **Multi-Size Generation** - Automatically create thumbnail (150x150), medium (500x500), and large (1200x1200) versions
- **WebP Conversion** - Convert all images to WebP format for 30-50% smaller file sizes
- **Cloudinary Integration** - Seamless upload to cloud storage with CDN delivery
- **Parallel Processing** - Process all image sizes simultaneously for speed
- **File Validation** - Type, size, and integrity checks
- **Error Handling** - Comprehensive error messages and validation
- **Delete Support** - Remove images from Cloudinary programmatically

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **Sharp** - High-performance image processing
- **Multer** - Multipart form-data handling
- **Cloudinary** - Cloud storage and CDN
- **TypeScript** - Type safety and modern JS

## Installation

```bash
# Clone repository
git clone https://github.com/brayzonn/image-upload-service.git
cd image-upload-service

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Add your Cloudinary credentials to .env
```

## Configuration

Create a `.env` file with:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MAX_FILE_SIZE=5242880
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/jpg,image/webp
```

## Usage

### Start the server

```bash
npm run start:dev
```

### Upload single image

```bash
curl -X POST http://localhost:3000/upload/image \
  -F "image=@/path/to/image.jpg"
```

### Upload multiple images

```bash
curl -X POST http://localhost:3000/upload/images \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

### Response Example

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "original": {
    "filename": "photo.jpg",
    "mimetype": "image/jpeg",
    "size": 1245678
  },
  "images": {
    "thumbnail": {
      "url": "https://res.cloudinary.com/.../thumbnail.webp",
      "width": 150,
      "height": 150,
      "size": 8456,
      "format": "webp"
    },
    "medium": {
      "url": "https://res.cloudinary.com/.../medium.webp",
      "width": 500,
      "height": 500,
      "size": 45678,
      "format": "webp"
    },
    "large": {
      "url": "https://res.cloudinary.com/.../large.webp",
      "width": 1200,
      "height": 1200,
      "size": 156789,
      "format": "webp"
    }
  },
  "uploadedAt": "2025-11-12T10:30:00.000Z"
}
```

## API Endpoints

| Method | Endpoint         | Description                     |
| ------ | ---------------- | ------------------------------- |
| POST   | `/upload/image`  | Upload single image             |
| POST   | `/upload/images` | Upload multiple images (max 10) |
| DELETE | `/upload/image`  | Delete image from Cloudinary    |

## Advanced Features

- Automatic WebP conversion (30-50% size reduction)
- Parallel image processing for speed
- Center-crop resizing for consistent dimensions
- File type and size validation
- Cloudinary folder organization
- Delete functionality for cleanup

## Project Structure

```
src/
├── upload/
│   ├── upload.module.ts
│   ├── upload.controller.ts
│   ├── upload.service.ts
│   ├── dto/
│   │   └── upload-response.dto.ts
│   └── config/
│       └── cloudinary.config.ts
└── main.ts
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Author

- Twitter: [@brayzoney](https://x.com/brayzoney)
