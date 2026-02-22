/**
 * Storage Service
 *
 * Handles file uploads to Cloudflare R2.
 */

/**
 * Generate a unique key for storing an image
 */
function generateKey(filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const ext = filename.split('.').pop() || 'bin';
  return `images/${timestamp}-${random}.${ext}`;
}

/**
 * Parse R2 custom domain or default URL
 */
function getPublicUrl(bucket: R2Bucket, key: string, customDomain?: string): string {
  if (customDomain) {
    return `https://${customDomain}/${key}`;
  }
  // Fallback: R2 public URL format (requires public bucket)
  // In production, use a custom domain or Cloudflare Worker to serve
  return `/${key}`;
}

export class StorageService {
  private bucket: R2Bucket;
  private customDomain?: string;

  constructor(bucket: R2Bucket, customDomain?: string) {
    this.bucket = bucket;
    this.customDomain = customDomain;
  }

  /**
   * Upload an image to R2
   * Returns the public URL
   */
  async uploadImage(
    data: ArrayBuffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    const key = generateKey(filename);

    await this.bucket.put(key, data, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=31536000', // 1 year cache
      },
      customMetadata: {
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
      },
    });

    return getPublicUrl(this.bucket, key, this.customDomain);
  }

  /**
   * Upload multiple images with bounded concurrency.
   * Limits to 3 concurrent R2 uploads to avoid overwhelming the bucket.
   */
  async uploadImages(
    files: Array<{ data: ArrayBuffer; filename: string; contentType: string }>
  ): Promise<string[]> {
    const MAX_CONCURRENT = 3;
    const results: string[] = [];

    for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
      const batch = files.slice(i, i + MAX_CONCURRENT);
      const urls = await Promise.all(
        batch.map((file) => this.uploadImage(file.data, file.filename, file.contentType))
      );
      results.push(...urls);
    }

    return results;
  }

  /**
   * Upload base64-encoded image
   */
  async uploadBase64Image(
    base64Data: string,
    filename: string,
    contentType: string
  ): Promise<string> {
    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');

    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return this.uploadImage(bytes.buffer, filename, contentType);
  }

  /**
   * Delete an image from R2
   */
  async deleteImage(key: string): Promise<boolean> {
    try {
      await this.bucket.delete(key);
      return true;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Delete multiple images with bounded concurrency
   */
  async deleteImages(keys: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const MAX_CONCURRENT = 3;
    const allResults: Array<{ key: string; success: boolean }> = [];

    for (let i = 0; i < keys.length; i += MAX_CONCURRENT) {
      const batch = keys.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.all(
        batch.map(async (key) => ({
          key,
          success: await this.deleteImage(key),
        }))
      );
      allResults.push(...results);
    }

    return {
      deleted: allResults.filter((r) => r.success).map((r) => r.key),
      failed: allResults.filter((r) => !r.success).map((r) => r.key),
    };
  }

  /**
   * Get a signed URL for temporary access
   * Note: R2 doesn't support pre-signed URLs like S3
   * This returns a path that should be served through a Worker
   */
  async getSignedUrl(key: string, _expiresIn: number): Promise<string> {
    // Check if object exists
    const object = await this.bucket.head(key);
    if (!object) {
      throw new Error('Object not found');
    }

    // For R2, we return the key and handle auth at the Worker level
    // In production, implement token-based access or use Cloudflare Access
    return getPublicUrl(this.bucket, key, this.customDomain);
  }

  /**
   * Check if an image exists
   */
  async exists(key: string): Promise<boolean> {
    const object = await this.bucket.head(key);
    return object !== null;
  }

  /**
   * Get image metadata
   */
  async getMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    uploadedAt: string;
    originalFilename: string;
  } | null> {
    const object = await this.bucket.head(key);
    if (!object) {
      return null;
    }

    return {
      size: object.size,
      contentType: object.httpMetadata?.contentType || 'application/octet-stream',
      uploadedAt: object.customMetadata?.uploadedAt || object.uploaded.toISOString(),
      originalFilename: object.customMetadata?.originalFilename || key,
    };
  }

  /**
   * List images with optional prefix
   */
  async listImages(
    prefix = 'images/',
    limit = 100,
    cursor?: string
  ): Promise<{
    objects: Array<{ key: string; size: number; uploaded: Date }>;
    cursor?: string;
    truncated: boolean;
  }> {
    const listed = await this.bucket.list({
      prefix,
      limit,
      cursor,
    });

    return {
      objects: listed.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
      })),
      cursor: listed.truncated ? listed.cursor : undefined,
      truncated: listed.truncated,
    };
  }
}
