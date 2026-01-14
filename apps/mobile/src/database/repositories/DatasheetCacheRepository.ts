import { db } from '../Database';
import { TABLES, CACHE_TTL } from '../schema';
import type { SpecValue } from '@speccheck/shared-types';

/**
 * Cached datasheet entry
 */
export interface CachedDatasheet {
  id: number;
  url: string;
  partNumber: string;
  contentHash: string;
  parsedSpecs: Record<string, SpecValue> | null;
  rawText: string | null;
  pageCount: number | null;
  fileSize: number | null;
  createdAt: number;
  expiresAt: number | null;
}

/**
 * Database row type
 */
interface DatasheetCacheRow {
  id: number;
  url: string;
  part_number: string;
  content_hash: string;
  parsed_specs_json: string | null;
  raw_text: string | null;
  page_count: number | null;
  file_size: number | null;
  created_at: number;
  expires_at: number | null;
}

/**
 * Repository for cached datasheet content.
 *
 * Stores parsed datasheet information to avoid re-downloading
 * and re-parsing PDFs for components we've seen before.
 */
export class DatasheetCacheRepository {
  /**
   * Get cached datasheet by URL.
   */
  async getByUrl(url: string): Promise<CachedDatasheet | null> {
    const now = Date.now();

    const row = await db.queryFirst<DatasheetCacheRow>(
      `SELECT * FROM ${TABLES.DATASHEET_CACHE}
       WHERE url = ? AND (expires_at IS NULL OR expires_at > ?)`,
      [url, now]
    );

    if (!row) return null;

    return this.rowToDatasheet(row);
  }

  /**
   * Get cached datasheet by part number.
   */
  async getByPartNumber(partNumber: string): Promise<CachedDatasheet | null> {
    const now = Date.now();

    const row = await db.queryFirst<DatasheetCacheRow>(
      `SELECT * FROM ${TABLES.DATASHEET_CACHE}
       WHERE part_number = ? AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY created_at DESC LIMIT 1`,
      [partNumber, now]
    );

    if (!row) return null;

    return this.rowToDatasheet(row);
  }

  /**
   * Check if a datasheet is cached and valid.
   */
  async isCached(url: string): Promise<boolean> {
    const now = Date.now();

    const result = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.DATASHEET_CACHE}
       WHERE url = ? AND (expires_at IS NULL OR expires_at > ?)`,
      [url, now]
    );

    return (result?.count ?? 0) > 0;
  }

  /**
   * Check if content has changed using hash comparison.
   */
  async hasContentChanged(url: string, newHash: string): Promise<boolean> {
    const cached = await this.getByUrl(url);
    if (!cached) return true;
    return cached.contentHash !== newHash;
  }

  /**
   * Cache a parsed datasheet.
   */
  async cache(
    url: string,
    partNumber: string,
    contentHash: string,
    parsedSpecs: Record<string, SpecValue> | null,
    rawText?: string,
    pageCount?: number,
    fileSize?: number
  ): Promise<number> {
    const now = Date.now();
    const expiresAt = now + CACHE_TTL.DATASHEET;

    const result = await db.run(
      `INSERT INTO ${TABLES.DATASHEET_CACHE}
       (url, part_number, content_hash, parsed_specs_json, raw_text,
        page_count, file_size, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET
         part_number = excluded.part_number,
         content_hash = excluded.content_hash,
         parsed_specs_json = excluded.parsed_specs_json,
         raw_text = excluded.raw_text,
         page_count = excluded.page_count,
         file_size = excluded.file_size,
         created_at = excluded.created_at,
         expires_at = excluded.expires_at`,
      [
        url,
        partNumber,
        contentHash,
        parsedSpecs ? JSON.stringify(parsedSpecs) : null,
        rawText ?? null,
        pageCount ?? null,
        fileSize ?? null,
        now,
        expiresAt,
      ]
    );

    return result.lastInsertRowId;
  }

  /**
   * Update parsed specs for an existing cache entry.
   */
  async updateParsedSpecs(
    url: string,
    parsedSpecs: Record<string, SpecValue>
  ): Promise<boolean> {
    const result = await db.run(
      `UPDATE ${TABLES.DATASHEET_CACHE}
       SET parsed_specs_json = ?
       WHERE url = ?`,
      [JSON.stringify(parsedSpecs), url]
    );

    return result.changes > 0;
  }

  /**
   * Remove expired cache entries.
   */
  async cleanExpired(): Promise<number> {
    const now = Date.now();

    const result = await db.run(
      `DELETE FROM ${TABLES.DATASHEET_CACHE}
       WHERE expires_at IS NOT NULL AND expires_at < ?`,
      [now]
    );

    return result.changes;
  }

  /**
   * Delete cache entry by URL.
   */
  async delete(url: string): Promise<boolean> {
    const result = await db.run(
      `DELETE FROM ${TABLES.DATASHEET_CACHE} WHERE url = ?`,
      [url]
    );

    return result.changes > 0;
  }

  /**
   * Clear all cached datasheets.
   */
  async clearAll(): Promise<void> {
    await db.run(`DELETE FROM ${TABLES.DATASHEET_CACHE}`);
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<{
    totalCount: number;
    totalSizeBytes: number;
    expiredCount: number;
    oldestEntry: number | null;
  }> {
    const now = Date.now();

    const countResult = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.DATASHEET_CACHE}`
    );

    const sizeResult = await db.queryFirst<{ total: number }>(
      `SELECT COALESCE(SUM(file_size), 0) as total FROM ${TABLES.DATASHEET_CACHE}`
    );

    const expiredResult = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.DATASHEET_CACHE}
       WHERE expires_at IS NOT NULL AND expires_at < ?`,
      [now]
    );

    const oldestResult = await db.queryFirst<{ created_at: number }>(
      `SELECT created_at FROM ${TABLES.DATASHEET_CACHE}
       ORDER BY created_at ASC LIMIT 1`
    );

    return {
      totalCount: countResult?.count ?? 0,
      totalSizeBytes: sizeResult?.total ?? 0,
      expiredCount: expiredResult?.count ?? 0,
      oldestEntry: oldestResult?.created_at ?? null,
    };
  }

  /**
   * Get total cache size in bytes.
   */
  async getTotalSizeBytes(): Promise<number> {
    const result = await db.queryFirst<{ total: number }>(
      `SELECT COALESCE(SUM(file_size), 0) as total FROM ${TABLES.DATASHEET_CACHE}`
    );

    return result?.total ?? 0;
  }

  /**
   * Convert database row to datasheet type.
   */
  private rowToDatasheet(row: DatasheetCacheRow): CachedDatasheet {
    return {
      id: row.id,
      url: row.url,
      partNumber: row.part_number,
      contentHash: row.content_hash,
      parsedSpecs: row.parsed_specs_json ? JSON.parse(row.parsed_specs_json) : null,
      rawText: row.raw_text,
      pageCount: row.page_count,
      fileSize: row.file_size,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }
}

// Export singleton instance
export const datasheetCache = new DatasheetCacheRepository();
