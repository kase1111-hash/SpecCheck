/**
 * Datasheet Service
 *
 * Handles datasheet lookup, caching, and search.
 * Uses Cloudflare KV for caching and Supabase for persistence.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatasheetResponse, DatasheetMatch } from '../routes/types';
import {
  getDatasheetByPartNumber,
  searchDatasheets,
  identifyComponent,
  getDatasheetsByPartNumbers,
} from '../db/datasheets';
import { CACHE_TTL } from '../env';

export class DatasheetService {
  private kv: KVNamespace;
  private db: SupabaseClient;

  constructor(kv: KVNamespace, db: SupabaseClient) {
    this.kv = kv;
    this.db = db;
  }

  /**
   * Generate cache key for a part number
   */
  private cacheKey(partNumber: string): string {
    return `datasheet:${partNumber.toUpperCase()}`;
  }

  /**
   * Get datasheet by part number
   * Checks KV cache first, then queries Supabase
   */
  async getByPartNumber(partNumber: string): Promise<DatasheetResponse | null> {
    const key = this.cacheKey(partNumber);

    // 1. Check KV cache
    const cached = await this.kv.get<DatasheetResponse>(key, 'json');
    if (cached) {
      return cached;
    }

    // 2. Query Supabase
    const datasheet = await getDatasheetByPartNumber(this.db, partNumber);
    if (!datasheet) {
      return null;
    }

    // 3. Cache result in KV
    await this.kv.put(key, JSON.stringify(datasheet), {
      expirationTtl: CACHE_TTL.DATASHEET,
    });

    return datasheet;
  }

  /**
   * Get multiple datasheets by part numbers (batch)
   */
  async getByPartNumbers(partNumbers: string[]): Promise<Map<string, DatasheetResponse>> {
    const results = new Map<string, DatasheetResponse>();
    const uncached: string[] = [];

    // Check cache for each part number
    await Promise.all(
      partNumbers.map(async (pn) => {
        const key = this.cacheKey(pn);
        const cached = await this.kv.get<DatasheetResponse>(key, 'json');
        if (cached) {
          results.set(pn, cached);
        } else {
          uncached.push(pn);
        }
      })
    );

    // Fetch uncached from database
    if (uncached.length > 0) {
      const datasheets = await getDatasheetsByPartNumbers(this.db, uncached);

      // Cache and add to results
      await Promise.all(
        datasheets.map(async (ds) => {
          const key = this.cacheKey(ds.partNumber);
          await this.kv.put(key, JSON.stringify(ds), {
            expirationTtl: CACHE_TTL.DATASHEET,
          });
          results.set(ds.partNumber, ds);
        })
      );
    }

    return results;
  }

  /**
   * Search datasheets by query string
   */
  async search(query: string, category?: string): Promise<DatasheetMatch[]> {
    // Search Supabase (no caching for search results - they change often)
    const datasheets = await searchDatasheets(this.db, query, category, 20);

    // Convert to DatasheetMatch format
    return datasheets.map((ds) => ({
      partNumber: ds.partNumber,
      manufacturer: ds.manufacturer,
      category: ds.category,
      confidence: 1.0, // Full match from search
    }));
  }

  /**
   * Identify component from OCR text lines
   */
  async identify(
    textLines: string[],
    categoryHint?: string
  ): Promise<{ matches: DatasheetMatch[]; confidence: number }> {
    const matches = await identifyComponent(this.db, textLines, categoryHint);

    // Calculate overall confidence based on best match
    const confidence = matches.length > 0 ? matches[0].confidence : 0;

    return { matches, confidence };
  }

  /**
   * Invalidate cache for a part number
   */
  async invalidateCache(partNumber: string): Promise<void> {
    const key = this.cacheKey(partNumber);
    await this.kv.delete(key);
  }
}
