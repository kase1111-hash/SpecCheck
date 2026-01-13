/**
 * Network Utilities
 *
 * Handles network state detection and offline mode.
 */

import { Errors, type AppError } from './errors';
import { withRetry, RetryConfigs } from './retry';
import type { Result } from '@speccheck/shared-types';

/**
 * Network state
 */
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
}

/**
 * Current network state (would be updated by NetInfo listener)
 */
let currentNetworkState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'unknown',
};

/**
 * Update network state (called from NetInfo listener)
 */
export function updateNetworkState(state: NetworkState): void {
  currentNetworkState = state;
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return currentNetworkState.isConnected && currentNetworkState.isInternetReachable !== false;
}

/**
 * Get current network state
 */
export function getNetworkState(): NetworkState {
  return { ...currentNetworkState };
}

/**
 * Fetch wrapper with timeout and error handling
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Result<Response, AppError>> {
  // Check network first
  if (!isOnline()) {
    return { ok: false, error: Errors.networkOffline() };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, error: Errors.apiError(response.status) };
    }

    return { ok: true, value: response };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { ok: false, error: Errors.timeout() };
      }
      // Network error (offline, DNS failure, etc.)
      return { ok: false, error: Errors.networkOffline() };
    }

    return { ok: false, error: Errors.apiError(0, error as Error) };
  }
}

/**
 * Fetch JSON with retry and error handling
 */
export async function fetchJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<Result<T, AppError>> {
  return withRetry(async () => {
    const responseResult = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!responseResult.ok) {
      return responseResult;
    }

    try {
      const data = await responseResult.value.json();
      return { ok: true, value: data as T };
    } catch (error) {
      return {
        ok: false,
        error: Errors.apiError(0, error as Error),
      };
    }
  }, RetryConfigs.network);
}

/**
 * POST JSON with retry and error handling
 */
export async function postJson<T, R>(
  url: string,
  data: T
): Promise<Result<R, AppError>> {
  return fetchJson<R>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
