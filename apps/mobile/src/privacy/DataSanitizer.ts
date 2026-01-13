/**
 * DataSanitizer
 *
 * Sanitizes data before sending to APIs or logging.
 * Ensures no sensitive information leaks.
 */

import type {
  ComponentSpecs,
  Claim,
  CameraFrame,
  MatchedComponent,
  ComponentWithSpecs,
} from '@speccheck/shared-types';

/**
 * Data safe to send to the datasheet API
 */
export interface SanitizedDatasheetRequest {
  partNumber: string;
}

/**
 * Data safe to send to the analyze API
 */
export interface SanitizedAnalyzeRequest {
  claim: {
    category: string;
    value: number;
    unit: string;
  };
  components: Array<{
    partNumber: string;
    manufacturer: string;
    category: string;
    specs: Record<string, { value: number; unit: string }>;
  }>;
}

/**
 * Sanitize a datasheet lookup request
 * Only the part number is needed
 */
export function sanitizeForDatasheetAPI(partNumber: string): SanitizedDatasheetRequest {
  return {
    partNumber: partNumber.trim().toUpperCase(),
  };
}

/**
 * Sanitize data for the analyze API
 * Strips everything except what's needed for analysis
 */
export function sanitizeForAnalyzeAPI(
  claim: Claim,
  components: ComponentWithSpecs[]
): SanitizedAnalyzeRequest {
  return {
    claim: {
      category: claim.category,
      value: claim.value,
      unit: claim.unit,
      // Explicitly NOT including: source, originalText
    },
    components: components
      .filter((c) => c.specs !== null)
      .map((c) => ({
        partNumber: c.specs!.partNumber,
        manufacturer: c.specs!.manufacturer,
        category: c.specs!.category,
        specs: Object.fromEntries(
          Object.entries(c.specs!.specs).map(([key, spec]) => [
            key,
            { value: spec.value, unit: spec.unit },
            // Explicitly NOT including: conditions, min, max, typical
          ])
        ),
        // Explicitly NOT including: regionId, matchConfidence, datasheetUrl, etc.
      })),
  };
}

/**
 * Generic sanitize for API calls
 * Removes any fields that shouldn't be sent
 */
export function sanitizeForAPI<T extends Record<string, unknown>>(
  data: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const field of allowedFields) {
    if (field in data) {
      sanitized[field] = data[field];
    }
  }

  return sanitized;
}

/**
 * Fields that should never appear in logs
 */
const SENSITIVE_PATTERNS = [
  /image/i,
  /base64/i,
  /photo/i,
  /frame/i,
  /token/i,
  /password/i,
  /secret/i,
  /key/i,
  /auth/i,
  /email/i,
  /phone/i,
  /address/i,
  /location/i,
  /latitude/i,
  /longitude/i,
  /gps/i,
  /deviceId/i,
  /userId/i,
  /sessionId/i,
];

/**
 * Redact sensitive fields from an object for logging
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  data: T,
  depth: number = 0
): Record<string, unknown> {
  if (depth > 5) {
    return { _truncated: true };
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if key matches sensitive patterns
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      // Redact long strings (likely base64 or encoded data)
      sanitized[key] = value.length > 1000 ? `[STRING:${value.length}chars]` : value;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>, depth + 1);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.length > 10
        ? `[ARRAY:${value.length}items]`
        : value.map((item) =>
            typeof item === 'object' && item !== null
              ? sanitizeForLogging(item as Record<string, unknown>, depth + 1)
              : item
          );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Redact sensitive values from a string (for error messages)
 */
export function redactSensitive(text: string): string {
  return text
    // Redact anything that looks like base64 image data
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[IMAGE_DATA]')
    // Redact long alphanumeric strings (tokens, IDs)
    .replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED_TOKEN]')
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Redact phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
}

/**
 * Strip image data from a camera frame (for any case where frame might be logged)
 */
export function stripImageData(frame: CameraFrame): Omit<CameraFrame, 'imageBase64'> & { imageBase64: string } {
  return {
    ...frame,
    imageBase64: '[IMAGE_DATA_STRIPPED]',
  };
}

/**
 * Ensure no image data exists in an object tree
 */
export function assertNoImageData(obj: unknown, path: string = ''): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'string') {
    if (obj.startsWith('data:image') || (obj.length > 10000 && /^[A-Za-z0-9+/=]+$/.test(obj))) {
      throw new Error(`Image data found at ${path}. This should never be sent to server.`);
    }
    return;
  }

  if (typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => assertNoImageData(item, `${path}[${index}]`));
  } else {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      assertNoImageData(value, path ? `${path}.${key}` : key);
    }
  }
}
