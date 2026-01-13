/**
 * Error Types and Handling Utilities
 *
 * Provides structured error handling throughout the app.
 */

import type { Result } from '@speccheck/shared-types';

/**
 * Error categories for different failure modes
 */
export type ErrorCategory =
  | 'camera'        // Camera access/capture failures
  | 'detection'     // ML model failures
  | 'ocr'           // Text extraction failures
  | 'matching'      // Component matching failures
  | 'network'       // API/network failures
  | 'storage'       // Local storage failures
  | 'analysis'      // Constraint chain failures
  | 'validation'    // Input validation failures
  | 'unknown';      // Unexpected errors

/**
 * Structured error with category and recovery options
 */
export interface AppError {
  /** Error category */
  category: ErrorCategory;
  /** Error code for programmatic handling */
  code: string;
  /** User-friendly message */
  message: string;
  /** Technical details (for logging) */
  details?: string;
  /** Can the user retry this operation? */
  retryable: boolean;
  /** Suggested recovery action */
  recovery?: RecoveryAction;
  /** Original error if wrapped */
  cause?: Error;
}

/**
 * Recovery actions the user can take
 */
export type RecoveryAction =
  | 'retry'              // Try the same operation again
  | 'manual_entry'       // Enter information manually
  | 'use_cached'         // Use cached/offline data
  | 'skip'               // Skip this step
  | 'contact_support'    // Report the issue
  | 'grant_permission'   // Grant required permission
  | 'check_connection';  // Check network connection

/**
 * Create a structured AppError
 */
export function createError(
  category: ErrorCategory,
  code: string,
  message: string,
  options: Partial<AppError> = {}
): AppError {
  return {
    category,
    code,
    message,
    retryable: options.retryable ?? false,
    ...options,
  };
}

/**
 * Common error factories
 */
export const Errors = {
  // Camera errors
  cameraPermissionDenied: () =>
    createError('camera', 'CAMERA_PERMISSION_DENIED', 'Camera permission is required to scan components', {
      retryable: false,
      recovery: 'grant_permission',
    }),

  cameraNotAvailable: () =>
    createError('camera', 'CAMERA_NOT_AVAILABLE', 'Camera is not available on this device', {
      retryable: false,
    }),

  captureFailure: (cause?: Error) =>
    createError('camera', 'CAPTURE_FAILED', 'Failed to capture image. Please try again.', {
      retryable: true,
      recovery: 'retry',
      cause,
    }),

  // Detection errors
  modelNotLoaded: () =>
    createError('detection', 'MODEL_NOT_LOADED', 'Component detection is not ready. Please wait.', {
      retryable: true,
      recovery: 'retry',
    }),

  noComponentsDetected: () =>
    createError('detection', 'NO_COMPONENTS', 'No components were detected in this image', {
      retryable: true,
      recovery: 'manual_entry',
      details: 'Try capturing a clearer image with better lighting',
    }),

  lowConfidenceDetection: () =>
    createError('detection', 'LOW_CONFIDENCE', 'Components were detected but with low confidence', {
      retryable: true,
      recovery: 'manual_entry',
    }),

  // OCR errors
  ocrFailed: (cause?: Error) =>
    createError('ocr', 'OCR_FAILED', 'Could not read text from components', {
      retryable: true,
      recovery: 'manual_entry',
      cause,
      details: 'The component markings may be too small or unclear',
    }),

  noTextFound: () =>
    createError('ocr', 'NO_TEXT', 'No readable text found on components', {
      retryable: false,
      recovery: 'manual_entry',
    }),

  // Matching errors
  noMatchFound: (partNumber: string) =>
    createError('matching', 'NO_MATCH', `Could not identify component: ${partNumber}`, {
      retryable: false,
      recovery: 'manual_entry',
    }),

  ambiguousMatch: (candidates: number) =>
    createError('matching', 'AMBIGUOUS', `Multiple possible matches found (${candidates} candidates)`, {
      retryable: false,
      recovery: 'manual_entry',
    }),

  // Network errors
  networkOffline: () =>
    createError('network', 'OFFLINE', 'No internet connection. Using offline mode.', {
      retryable: true,
      recovery: 'use_cached',
    }),

  apiError: (status: number, cause?: Error) =>
    createError('network', `API_ERROR_${status}`, 'Server error. Please try again later.', {
      retryable: status >= 500,
      recovery: status >= 500 ? 'retry' : 'contact_support',
      cause,
    }),

  timeout: () =>
    createError('network', 'TIMEOUT', 'Request timed out. Please check your connection.', {
      retryable: true,
      recovery: 'check_connection',
    }),

  // Storage errors
  cacheReadError: (cause?: Error) =>
    createError('storage', 'CACHE_READ', 'Could not read from local storage', {
      retryable: true,
      recovery: 'retry',
      cause,
    }),

  cacheWriteError: (cause?: Error) =>
    createError('storage', 'CACHE_WRITE', 'Could not save to local storage', {
      retryable: false,
      cause,
    }),

  // Analysis errors
  insufficientData: () =>
    createError('analysis', 'INSUFFICIENT_DATA', 'Not enough component data for analysis', {
      retryable: false,
      recovery: 'manual_entry',
      details: 'Try identifying more components or enter specs manually',
    }),

  invalidClaim: (reason: string) =>
    createError('validation', 'INVALID_CLAIM', `Invalid claim: ${reason}`, {
      retryable: false,
    }),
};

/**
 * Wrap an async operation with error handling
 */
export async function tryAsync<T>(
  operation: () => Promise<T>,
  errorFactory: (cause: Error) => AppError
): Promise<Result<T, AppError>> {
  try {
    const value = await operation();
    return { ok: true, value };
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    return { ok: false, error: errorFactory(cause) };
  }
}

/**
 * Wrap a sync operation with error handling
 */
export function trySync<T>(
  operation: () => T,
  errorFactory: (cause: Error) => AppError
): Result<T, AppError> {
  try {
    const value = operation();
    return { ok: true, value };
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    return { ok: false, error: errorFactory(cause) };
  }
}

/**
 * Log an error with context
 */
export function logError(error: AppError, context?: Record<string, unknown>): void {
  console.error(`[${error.category}] ${error.code}: ${error.message}`, {
    details: error.details,
    recovery: error.recovery,
    retryable: error.retryable,
    cause: error.cause?.message,
    ...context,
  });
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: AppError): boolean {
  return error.retryable;
}

/**
 * Get user-friendly recovery message
 */
export function getRecoveryMessage(action: RecoveryAction): string {
  const messages: Record<RecoveryAction, string> = {
    retry: 'Tap to try again',
    manual_entry: 'Enter component details manually',
    use_cached: 'Continue with offline data',
    skip: 'Skip this step',
    contact_support: 'Report this issue',
    grant_permission: 'Open settings to grant permission',
    check_connection: 'Check your internet connection',
  };
  return messages[action];
}
