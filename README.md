![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Sharp](https://img.shields.io/badge/Sharp-99CC00?style=for-the-badge&logo=sharp&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

# Image Upload & Optimization Pipeline

An image processing API built with NestJS that handles image uploads, optimization, and cloud storage.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Functionality

- **Single & Multiple Image Uploads** - Handle one or many images at once (max 10)
- **Multi-Size Generation** - Automatically create thumbnail (150x150), medium (500x500), and large (1200x1200) versions
- **WebP Conversion** - Convert all images to WebP format for 30-50% smaller file sizes (85% quality)
- **Cloudinary Integration** - Seamless upload to cloud storage with global CDN delivery
- **Parallel Processing** - Process all image sizes simultaneously for maximum speed
- **Dynamic Organization** - Flexible folder structure based on userId and category
- **Delete Support** - Remove images from Cloudinary programmatically

### Infrastructure

- **Type Safety** - Full TypeScript support with DTOs and interfaces
- **File Validation** - Size limits (5MB default), mime-type checking, and integrity validation
- **Rate Limiting** - Built-in protection against abuse (20 requests/minute default)
- **Activity Logging** - Comprehensive request logging middleware
- **Error Handling** - Global exception filter for consistent error responses
- **Response Formatting** - Standardized API responses with timestamps
- **API Documentation** - Swagger/OpenAPI documentation in development mode
- **Security** - Helmet, CORS, request size limits, and cookie signing

## Tech Stack

- **NestJS** - Progressive Node.js framework for building efficient server-side applications
- **TypeScript** - Type safety and modern JavaScript features
- **Sharp** - High-performance image processing library (4-5x faster than alternatives)
- **Multer** - Middleware for handling multipart/form-data file uploads
- **Cloudinary** - Cloud storage, image optimization, and global CDN delivery
- **class-validator** - Decorator-based request validation
- **class-transformer** - Transform plain objects to class instances

## Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Cloudinary account ([Sign up free](https://cloudinary.com))

## Installation

```bash
# Clone repository
git clone https://github.com/brayzonn/image-upload-service.git
cd image-upload-service

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your .env file (see Configuration section)
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Security
COOKIE_SECRET=your-secure-cookie-secret-minimum-32-characters

# CORS Configuration (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Upload Limits
MAX_FILE_SIZE=5242880
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/jpg,image/webp

# Request Size Limits
MAX_JSON_SIZE=10mb
MAX_URL_ENCODED_SIZE=10mb

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=20
```

### Configuration Details

| Variable                | Description                          | Default                                     | Required |
| ----------------------- | ------------------------------------ | ------------------------------------------- | -------- |
| `NODE_ENV`              | Environment mode                     | `development`                               | No       |
| `PORT`                  | Server port                          | `3000`                                      | No       |
| `COOKIE_SECRET`         | Cookie signing secret (min 32 chars) | -                                           | Yes      |
| `ALLOWED_ORIGINS`       | CORS allowed origins                 | -                                           | Yes      |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name           | -                                           | Yes      |
| `CLOUDINARY_API_KEY`    | Your Cloudinary API key              | -                                           | Yes      |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret           | -                                           | Yes      |
| `MAX_FILE_SIZE`         | Maximum file size in bytes           | `5242880` (5MB)                             | No       |
| `ALLOWED_MIME_TYPES`    | Allowed image formats                | `image/jpeg,image/png,image/jpg,image/webp` | No       |
| `RATE_LIMIT_TTL`        | Rate limit window in milliseconds    | `60000` (1 min)                             | No       |
| `RATE_LIMIT_MAX`        | Max requests per window              | `20`                                        | No       |

## Architecture

### Application Flow

```
Client Request
    ↓
CORS Validation + Security Headers (Helmet)
    ↓
Activity Logger Middleware
    ↓
Rate Limit Middleware
    ↓
Request Size Validation
    ↓
Global Exception Filter
    ↓
Request Body Validation (class-validator)
    ↓
Response Interceptor
    ↓
Controller Layer
    ↓
Service Layer (Business Logic)
    ↓
Sharp Image Processing
    ↓
Cloudinary Upload
    ↓
Standardized Response
```

### Module Architecture

```
AppModule (Root)
├── ConfigModule (Global configuration)
├── HealthModule
│   └── HealthController (Cloudinary connectivity check)
└── UploadModule
    ├── UploadController (HTTP endpoints)
    └── UploadService (Image processing & upload logic)
```

### Configuration Layer

All application configuration is centralized and modular:

| Config File                          | Purpose                             | Used In              |
| ------------------------------------ | ----------------------------------- | -------------------- |
| `cors.config.ts`                     | CORS origin validation              | `main.ts`            |
| `helmet-compression.config.ts`       | Security headers + gzip compression | `main.ts`            |
| `validation.config.ts`               | Request validation rules            | `main.ts`            |
| `request-size.config.ts`             | Body parser size limits             | `main.ts`            |
| `swagger.config.ts`                  | API documentation setup             | `main.ts` (dev only) |
| `cookie.config.ts`                   | Signed cookie configuration         | `main.ts`            |
| `upload/config/cloudinary.config.ts` | Cloudinary SDK initialization       | `upload.module.ts`   |

### Middleware & Interceptors

**Middleware (Applied to all routes):**

- **LoggerMiddleware**: Logs all incoming requests with timestamp, method, URL, and IP address
- **DefaultRateLimitMiddleware**: Rate limiting to prevent abuse (configurable window and max requests)

**Global Interceptors:**

- **ResponseInterceptor**: Wraps all successful responses in standardized format with success flag and timestamp

**Global Filters:**

- **AllExceptionsFilter**: Catches all exceptions and formats error responses consistently

## API Endpoints

### Base URL

```
http://localhost:3000/api/v1
```

### Endpoints Overview

| Method   | Endpoint             | Description                                 |
| -------- | -------------------- | ------------------------------------------- |
| `GET`    | `/`                  | API information and available endpoints     |
| `GET`    | `/health/cloudinary` | Check Cloudinary connection status          |
| `POST`   | `/upload/image`      | Upload and process a single image           |
| `POST`   | `/upload/images`     | Upload and process multiple images (max 10) |
| `DELETE` | `/upload/image`      | Delete an image from Cloudinary by publicId |

### Upload Single Image

**POST** `/api/v1/upload/image`

**Request Format:**

```
Content-Type: multipart/form-data

Form Fields:
- image: File (required) - Image file to upload
- userId: string (optional) - User identifier for organization
- category: string (optional) - Category (e.g., profile, posts, products)
- folder: string (optional) - Custom Cloudinary folder path
- description: string (optional) - Image description
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/api/v1/upload/image \
  -F "image=@/path/to/photo.jpg" \
  -F "userId=user123" \
  -F "category=profile"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Image uploaded successfully",
    "original": {
      "filename": "photo.jpg",
      "mimetype": "image/jpeg",
      "size": 700634
    },
    "images": {
      "thumbnail": {
        "url": "https://res.cloudinary.com/.../user123_profile_thumbnail_1731582600000.webp",
        "width": 150,
        "height": 150,
        "size": 3496,
        "format": "webp"
      },
      "medium": {
        "url": "https://res.cloudinary.com/.../user123_profile_medium_1731582600000.webp",
        "width": 500,
        "height": 500,
        "size": 19556,
        "format": "webp"
      },
      "large": {
        "url": "https://res.cloudinary.com/.../user123_profile_large_1731582600000.webp",
        "width": 1200,
        "height": 1200,
        "size": 63922,
        "format": "webp"
      }
    },
    "metadata": {
      "userId": "user123",
      "category": "profile",
      "description": null,
      "folder": "uploads/profile/user123"
    },
    "uploadedAt": "2025-11-15T23:07:56.331Z"
  },
  "timestamp": "2025-11-15T23:07:56.331Z"
}
```

### Upload Multiple Images

**POST** `/api/v1/upload/images`

**Request Format:**

```
Content-Type: multipart/form-data

Form Fields:
- images: File[] (required) - Multiple image files (max 10)
- userId: string (optional)
- category: string (optional)
- folder: string (optional)
- description: string (optional)
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/api/v1/upload/images \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  -F "images=@photo3.jpg" \
  -F "userId=user123" \
  -F "category=posts"
```

**Response:** Array of upload responses (same structure as single upload)

### Delete Image

**DELETE** `/api/v1/upload/image`

**Request:**

```json
{
  "publicId": "uploads/profile/user123/user123_profile_thumbnail_1731582600000"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Image deleted successfully"
  },
  "timestamp": "2025-11-15T23:07:56.331Z"
}
```

**Note:** To delete all sizes of an image, you must delete each variant (thumbnail, medium, large) separately using their respective publicIds.

### Health Check

**GET** `/api/v1/health/cloudinary`

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "cloudinary",
    "connected": true,
    "cloudName": "your_cloud_name",
    "timestamp": "2025-11-15T23:07:56.331Z"
  },
  "timestamp": "2025-11-15T23:07:56.331Z"
}
```

## Usage Examples

### JavaScript/Fetch

```javascript
// Upload single image with metadata
async function uploadImage(file, userId, category) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('userId', userId);
  formData.append('category', category);
  formData.append('description', 'Profile picture');

  const response = await fetch('http://localhost:3000/api/v1/upload/image', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (result.success) {
    console.log('Thumbnail:', result.data.images.thumbnail.url);
    console.log('Medium:', result.data.images.medium.url);
    console.log('Large:', result.data.images.large.url);
  }

  return result;
}

// Upload multiple images
async function uploadMultipleImages(files, userId, category) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('images', file);
  });

  formData.append('userId', userId);
  formData.append('category', category);

  const response = await fetch('http://localhost:3000/api/v1/upload/images', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}

// Delete image
async function deleteImage(publicId) {
  const response = await fetch('http://localhost:3000/api/v1/upload/image', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId }),
  });

  return await response.json();
}
```

### TypeScript/Axios

```typescript
import axios from 'axios';

interface UploadResponse {
  success: boolean;
  data: {
    success: boolean;
    message: string;
    images: {
      thumbnail: {
        url: string;
        width: number;
        height: number;
        size: number;
        format: string;
      };
      medium: {
        url: string;
        width: number;
        height: number;
        size: number;
        format: string;
      };
      large: {
        url: string;
        width: number;
        height: number;
        size: number;
        format: string;
      };
    };
    metadata: {
      userId?: string;
      category?: string;
      description?: string;
      folder: string;
    };
    uploadedAt: string;
  };
  timestamp: string;
}

async function uploadImage(
  file: File,
  userId: string,
  category: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('userId', userId);
  formData.append('category', category);

  const response = await axios.post<UploadResponse>(
    'http://localhost:3000/api/v1/upload/image',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );

  return response.data;
}
```

### React Component Example

```typescript
import { useState } from 'react';

function ImageUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [userId] = useState('user123');
  const [category, setCategory] = useState('profile');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('userId', userId);
    formData.append('category', category);

    try {
      const response = await fetch('http://localhost:3000/api/v1/upload/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      console.log('Upload successful:', data);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="profile">Profile Picture</option>
        <option value="posts">Post Image</option>
        <option value="products">Product Image</option>
      </select>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button type="submit" disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>

      {result && (
        <div>
          <h3>Upload Successful!</h3>
          <img src={result.data.images.thumbnail.url} alt="Thumbnail" />
          <img src={result.data.images.medium.url} alt="Medium" />
          <img src={result.data.images.large.url} alt="Large" />
        </div>
      )}
    </form>
  );
}
```

## Project Structure

```
src/
├── common/                          # Shared utilities and infrastructure
│   ├── filters/
│   │   └── all-exceptions.filter.ts    # Global error handling
│   ├── interceptors/
│   │   └── response.interceptor.ts     # Standardized response formatting
│   ├── middleware/
│   │   ├── activity-logger.middleware.ts  # Request logging
│   │   └── rate-limit.middleware.ts       # Rate limiting protection
│   └── utils/
│       └── response.util.ts              # Response helper functions
├── config/                          # Application configuration
│   ├── cookie.config.ts            # Cookie signing options
│   ├── cors.config.ts              # CORS origin configuration
│   ├── helmet-compression.config.ts   # Security headers + compression
│   ├── request-size.config.ts      # Body parser size limits
│   ├── swagger.config.ts           # API documentation setup
│   └── validation.config.ts        # Global validation rules
├── health/                          # Health check module
│   ├── health.controller.ts        # Health check endpoints
│   └── health.module.ts
├── upload/                          # Image upload module
│   ├── config/
│   │   └── cloudinary.config.ts       # Cloudinary SDK initialization
│   ├── dto/
│   │   └── upload-response.dto.ts     # Response structure definition
│   ├── interfaces/
│   │   ├── upload-image.dto.ts        # Request validation DTO
│   │   └── upload-options.interface.ts  # Upload configuration interface
│   ├── upload.controller.ts        # HTTP endpoints (POST, DELETE)
│   ├── upload.module.ts            # Module definition and providers
│   └── upload.service.ts           # Core image processing logic
├── app.controller.ts               # Root controller (API info endpoint)
├── app.module.ts                   # Root module (application entry)
└── main.ts                         # Application bootstrap
```

## How It Works

### Image Processing Pipeline

```
1. File Upload
   └─ Multer intercepts multipart/form-data
   └─ Extracts file buffer and metadata

2. Validation
   └─ File size check (max 5MB)
   └─ MIME type validation (JPEG, PNG, WebP)
   └─ Sharp metadata validation (ensures valid image)

3. Parallel Processing
   ├─ Thumbnail (150x150)
   │  └─ Sharp resize with center crop
   │  └─ WebP conversion at 85% quality
   │  └─ Stream to Cloudinary
   │
   ├─ Medium (500x500)
   │  └─ Sharp resize with center crop
   │  └─ WebP conversion at 85% quality
   │  └─ Stream to Cloudinary
   │
   └─ Large (1200x1200)
      └─ Sharp resize with center crop
      └─ WebP conversion at 85% quality
      └─ Stream to Cloudinary

4. Cloudinary Upload
   └─ Stream-based upload (memory efficient)
   └─ Organized in dynamic folder structure
   └─ Returns secure URLs and metadata

5. Response Generation
   └─ Combine all sizes with metadata
   └─ Wrap in standardized response format
   └─ Return to client
```

### Dynamic Folder Organization

The service automatically organizes uploads based on the provided parameters:

| Parameters            | Cloudinary Folder Path         | Filename Prefix           |
| --------------------- | ------------------------------ | ------------------------- |
| No params             | `uploads/`                     | `image_`                  |
| `userId` only         | `uploads/users/{userId}/`      | `{userId}_`               |
| `category` only       | `uploads/{category}/`          | `{category}_`             |
| `userId` + `category` | `uploads/{category}/{userId}/` | `{userId}_{category}_`    |
| Custom `folder`       | `{folder}/`                    | `image_` or custom prefix |

**Examples:**

```
# Profile picture for user123
uploads/profile/user123/user123_profile_thumbnail_1731582600000.webp
uploads/profile/user123/user123_profile_medium_1731582600000.webp
uploads/profile/user123/user123_profile_large_1731582600000.webp

# Product image for user456
uploads/products/user456/user456_products_thumbnail_1731582700000.webp
uploads/products/user456/user456_products_medium_1731582700000.webp
uploads/products/user456/user456_products_large_1731582700000.webp

# Generic upload
uploads/image_thumbnail_1731582800000.webp
uploads/image_medium_1731582800000.webp
uploads/image_large_1731582800000.webp
```

### Image Optimization Details

**Format Conversion:**

- All images converted to WebP format
- WebP provides 30-50% better compression than JPEG
- Maintains high visual quality at 85% compression

**Resize Strategy:**

- **Mode**: `cover` (fills entire target dimension)
- **Position**: `center` (crops from center for balanced composition)
- **Quality**: 85% (optimal balance of quality vs file size)

**Why 85% Quality?**

- Imperceptible quality loss for most viewers
- Significant file size reduction (60-70% smaller)
- Industry standard for web delivery
- Faster page load times

**Performance Metrics:**

- Parallel processing: All 3 sizes processed simultaneously
- Average processing time: 2-4 seconds for single image
- Average processing time: 5-8 seconds for 5 images (parallel)
- Memory efficient: Stream-based upload prevents memory spikes

## Development

```bash
# Development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Format code with Prettier
npm run format

# Lint code with ESLint
npm run lint

# Type check
npm run type-check
```

### API Documentation

When running in development mode, Swagger/OpenAPI documentation is automatically available at:

```
http://localhost:3000/api/docs
```

The documentation provides:

- Interactive API testing
- Request/response schemas
- Parameter descriptions
- Example values

### Environment-Specific Logging

The application uses different log levels based on environment:

**Development:**

- Logs: `log`, `error`, `warn`, `debug`, `verbose`
- Detailed request/response logging
- Stack traces for errors

**Production:**

- Logs: `error`, `warn`
- Minimal logging for performance
- Error tracking only

## Production Deployment

### Environment Setup

1. Set `NODE_ENV=production` in your environment
2. Use a strong `COOKIE_SECRET` (minimum 32 characters, random)
3. Configure `ALLOWED_ORIGINS` with your actual frontend domains
4. Use production Cloudinary credentials
5. Consider increasing rate limits for production load
6. Set appropriate `MAX_FILE_SIZE` based on your needs

### Security Checklist

Before deploying to production:

- [ ] `NODE_ENV=production` is set
- [ ] `COOKIE_SECRET` is at least 32 characters
- [ ] `ALLOWED_ORIGINS` configured with actual domains
- [ ] Cloudinary credentials are production keys
- [ ] HTTPS is enforced (configure reverse proxy)
- [ ] Rate limits are appropriate for expected traffic
- [ ] File size limits are set appropriately
- [ ] Logging is configured for production
- [ ] Error tracking is set up (e.g., Sentry)
- [ ] Health checks are monitored

### PM2 Deployment

The project includes PM2 configuration for process management:

```bash
# Start with PM2
npm run pm2:start

# Monitor application
npm run pm2:monitor

# View logs
npm run pm2:logs

# Restart application
npm run pm2:restart

# Stop application
npm run pm2:stop

# Delete from PM2
npm run pm2:delete
```

**PM2 Features:**

- Automatic restarts on crashes
- Load balancing (cluster mode)
- Memory monitoring
- Log management
- Zero-downtime reloads

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    restart: unless-stopped
```

**Build and run:**

```bash
# Build image
docker build -t image-upload-api .

# Run container
docker run -p 3000:3000 --env-file .env image-upload-api

# Or use docker-compose
docker-compose up -d
```

## Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Generate test coverage
npm run test:cov

# Watch mode for development
npm run test:watch
```

### Test Structure

```
test/
├── app.e2e-spec.ts          # End-to-end tests
└── jest-e2e.json            # E2E test configuration
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Brayz**

- Twitter: [@brayzoney](https://x.com/brayzoney)
- GitHub: [@brayzonn](https://github.com/brayzonn)

## Acknowledgments

- NestJS team for the excellent framework
- Sharp for high-performance image processing
- Cloudinary for cloud storage and CDN
