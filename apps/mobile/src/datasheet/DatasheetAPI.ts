/**
 * DatasheetAPI
 *
 * Remote API client for datasheet lookups.
 * Falls back to this when local cache misses.
 */

import type {
  ComponentSpecs,
  DatasheetResponse,
  DatasheetSearchRequest,
  DatasheetSearchResponse,
  IdentifyRequest,
  IdentifyResponse,
  ComponentCategory,
} from '@speccheck/shared-types';
import { useAppStore } from '../store';
import { fetchWithTimeout } from '../utils/network';

/** API base URL */
const API_BASE_URL = 'https://api.speccheck.app';

/** Give up on a stalled request instead of leaving the scan waiting forever */
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Whether the user has turned on Offline Mode, which keeps every lookup on-device
 */
export function isOfflineOnly(): boolean {
  return useAppStore.getState().settings.offlineOnly;
}

/**
 * Datasheet API client
 */
export class DatasheetAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Send a request unless Offline Mode is on. Resolves to null when the
   * request is skipped, times out, or fails, so callers fall back the same way.
   */
  private async request(path: string, init?: RequestInit): Promise<Response | null> {
    if (isOfflineOnly()) {
      return null;
    }

    const result = await fetchWithTimeout(`${this.baseUrl}${path}`, init, REQUEST_TIMEOUT_MS);
    if (!result.ok) {
      console.warn(`[DatasheetAPI] ${path} failed: ${result.error.message}`);
      return null;
    }
    return result.value;
  }

  /**
   * Get datasheet by part number
   */
  async getByPartNumber(partNumber: string): Promise<ComponentSpecs | null> {
    try {
      const response = await this.request(
        `/api/datasheet/${encodeURIComponent(partNumber)}`
      );

      if (!response) {
        return null;
      }

      const data: DatasheetResponse = await response.json();

      return {
        partNumber: data.partNumber,
        manufacturer: data.manufacturer,
        category: data.category as ComponentCategory,
        source: 'api',
        specs: data.specs,
        datasheetUrl: data.datasheetUrl,
        lastUpdated: data.lastUpdated,
      };
    } catch (error) {
      console.error('[DatasheetAPI] getByPartNumber error:', error);
      return null;
    }
  }

  /**
   * Search for datasheets
   */
  async search(request: DatasheetSearchRequest): Promise<DatasheetSearchResponse> {
    try {
      const response = await this.request('/api/datasheet/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response) {
        return { matches: [], totalCount: 0 };
      }

      return await response.json();
    } catch (error) {
      console.error('[DatasheetAPI] search error:', error);
      return { matches: [], totalCount: 0 };
    }
  }

  /**
   * Identify component from OCR text
   */
  async identify(request: IdentifyRequest): Promise<IdentifyResponse> {
    try {
      const response = await this.request('/api/datasheet/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response) {
        return { matches: [], confidence: 0 };
      }

      return await response.json();
    } catch (error) {
      console.error('[DatasheetAPI] identify error:', error);
      return { matches: [], confidence: 0 };
    }
  }
}

/**
 * Singleton instance
 */
let apiInstance: DatasheetAPI | null = null;

/**
 * Get the datasheet API instance
 */
export function getDatasheetAPI(): DatasheetAPI {
  if (!apiInstance) {
    apiInstance = new DatasheetAPI();
  }
  return apiInstance;
}
