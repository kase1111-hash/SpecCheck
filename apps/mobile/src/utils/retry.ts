/**
 * Retry Utilities
 *
 * Handles automatic retries with exponential backoff.
 */

import type { Result } from '@speccheck/shared-types';
import type { AppError } from './errors';
import { isRetryable, logError } from './errors';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of attempts */
  maxAttempts: number;
  /** Initial delay in ms */
  initialDelay: number;
  /** Maximum delay in ms */
  maxDelay: number;
  /** Backoff multiplier */
  backoffFactor: number;
  /** Whether to add jitter */
  jitter: boolean;
  /** Callback on each retry */
  onRetry?: (attempt: number, delay: number, error: AppError) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  jitter: true,
};

/**
 * Calculate delay for a given attempt
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  let delay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
  delay = Math.min(delay, config.maxDelay);

  if (config.jitter) {
    // Add ±25% jitter
    const jitterRange = delay * 0.25;
    delay = delay - jitterRange + Math.random() * jitterRange * 2;
  }

  return Math.round(delay);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an operation with automatic retries
 */
export async function withRetry<T>(
  operation: () => Promise<Result<T, AppError>>,
  config: Partial<RetryConfig> = {}
): Promise<Result<T, AppError>> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AppError | null = null;

  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    const result = await operation();

    if (result.ok) {
      return result;
    }

    lastError = result.error;

    // Don't retry if error is not retryable
    if (!isRetryable(lastError)) {
      return result;
    }

    // Don't wait after the last attempt
    if (attempt < fullConfig.maxAttempts) {
      const delay = calculateDelay(attempt, fullConfig);

      logError(lastError, { attempt, nextRetryIn: delay });
      fullConfig.onRetry?.(attempt, delay, lastError);

      await sleep(delay);
    }
  }

  // All retries exhausted
  return { ok: false, error: lastError! };
}

/**
 * Retry configuration for different operation types
 */
export const RetryConfigs = {
  /** Quick retry for local operations */
  local: {
    maxAttempts: 2,
    initialDelay: 100,
    maxDelay: 500,
    backoffFactor: 2,
    jitter: false,
  } as RetryConfig,

  /** Network operations with longer delays */
  network: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
  } as RetryConfig,

  /** Aggressive retry for critical operations */
  critical: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
  } as RetryConfig,
};
