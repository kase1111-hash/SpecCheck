/**
 * PrivacyGuard
 *
 * Runtime checks to ensure privacy policies are enforced.
 * Acts as a final safeguard before data leaves the device.
 */

import { getDataPolicy, type DataCategory, type DataDestination } from './PrivacyPolicy';
import { assertNoImageData, sanitizeForLogging } from './DataSanitizer';

/**
 * Privacy violation error
 */
export class PrivacyViolationError extends Error {
  constructor(
    public category: DataCategory,
    public destination: DataDestination,
    message: string
  ) {
    super(`Privacy violation: ${message}`);
    this.name = 'PrivacyViolationError';
  }
}

/**
 * Check if sending data to destination is allowed
 * Throws if not allowed
 */
export function assertPrivacySafe(
  data: unknown,
  category: DataCategory,
  destination: DataDestination
): void {
  const policy = getDataPolicy(category);

  // Check destination permissions
  if (destination.startsWith('api_') && !policy.allowAPI) {
    throw new PrivacyViolationError(
      category,
      destination,
      `${category} data cannot be sent to ${destination}`
    );
  }

  if (destination === 'device_storage' && !policy.allowDeviceStorage) {
    throw new PrivacyViolationError(
      category,
      destination,
      `${category} data cannot be stored on device`
    );
  }

  // For API destinations, ensure no image data
  if (destination.startsWith('api_')) {
    assertNoImageData(data);
  }
}

/**
 * PrivacyGuard class for wrapping API calls
 */
export class PrivacyGuard {
  /**
   * Wrap a fetch call with privacy checks
   */
  static async fetch(
    url: string,
    options: RequestInit & {
      dataCategory?: DataCategory;
      destination?: DataDestination;
    } = {}
  ): Promise<Response> {
    const { dataCategory, destination, body, ...fetchOptions } = options;

    // If data category is specified, validate
    if (dataCategory && destination && body) {
      let parsedBody: unknown;
      try {
        parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
      } catch {
        parsedBody = body;
      }

      assertPrivacySafe(parsedBody, dataCategory, destination);
    }

    // Always check for image data in request body
    if (body) {
      let parsedBody: unknown;
      try {
        parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        assertNoImageData(parsedBody, 'request.body');
      } catch (e) {
        if (e instanceof Error && e.message.includes('Image data found')) {
          throw e;
        }
        // JSON parse error is fine, might be form data
      }
    }

    // Log sanitized request for debugging (development only)
    if (__DEV__) {
      console.log('[PrivacyGuard] Request:', {
        url,
        method: fetchOptions.method || 'GET',
        bodyPreview: body ? sanitizeForLogging(
          typeof body === 'string' ? JSON.parse(body) : body
        ) : undefined,
      });
    }

    return fetch(url, { ...fetchOptions, body });
  }

  /**
   * Validate data before storing locally
   */
  static validateForStorage(data: unknown, category: DataCategory): void {
    assertPrivacySafe(data, category, 'device_storage');
  }

  /**
   * Validate data before sending to API
   */
  static validateForAPI(
    data: unknown,
    category: DataCategory,
    endpoint: 'datasheet' | 'analyze' | 'community'
  ): void {
    const destination: DataDestination = `api_${endpoint}` as DataDestination;
    assertPrivacySafe(data, category, destination);
  }
}

/**
 * Development mode flag
 */
declare const __DEV__: boolean;
