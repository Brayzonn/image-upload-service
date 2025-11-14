/**
 * Options for uploading images
 */
export interface UploadOptions {
  userId?: string;
  folder?: string;
  category?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * Metadata to include in upload response
 */
export interface UploadMetadata {
  userId?: string;
  category?: string;
  description?: string;
  folder?: string;
}
