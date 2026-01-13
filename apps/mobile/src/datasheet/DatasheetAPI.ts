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

/** API base URL */
const API_BASE_URL = 'https://api.speccheck.app';

/**
 * Datasheet API client
 */
export class DatasheetAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get datasheet by part number
   */
  async getByPartNumber(partNumber: string): Promise<ComponentSpecs | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/datasheet/${encodeURIComponent(partNumber)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API error: ${response.status}`);
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
      const response = await fetch(`${this.baseUrl}/api/datasheet/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
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
      const response = await fetch(`${this.baseUrl}/api/datasheet/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
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
