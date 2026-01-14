import { db } from '../Database';
import { TABLES, CACHE_TTL } from '../schema';
import type { ComponentSpecs, ComponentCategory, DataSource } from '@speccheck/shared-types';

/**
 * Database row type for component cache
 */
interface ComponentCacheRow {
  id: number;
  part_number: string;
  manufacturer: string;
  category: string;
  specs_json: string;
  source_type: string;
  source_url: string | null;
  source_confidence: number;
  datasheet_url: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
}

/**
 * Repository for cached component specifications.
 *
 * Provides fast local lookups for component specs that have been
 * previously fetched from datasheets or the backend API.
 */
export class ComponentCacheRepository {
  /**
   * Get cached specs for a component by part number.
   * Returns null if not cached or expired.
   */
  async getByPartNumber(partNumber: string): Promise<ComponentSpecs | null> {
    const now = Date.now();

    const row = await db.queryFirst<ComponentCacheRow>(
      `SELECT * FROM ${TABLES.COMPONENT_CACHE}
       WHERE part_number = ? AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY updated_at DESC LIMIT 1`,
      [partNumber, now]
    );

    if (!row) return null;

    return this.rowToComponentSpecs(row);
  }

  /**
   * Get cached specs by part number and manufacturer.
   */
  async getByPartNumberAndManufacturer(
    partNumber: string,
    manufacturer: string
  ): Promise<ComponentSpecs | null> {
    const now = Date.now();

    const row = await db.queryFirst<ComponentCacheRow>(
      `SELECT * FROM ${TABLES.COMPONENT_CACHE}
       WHERE part_number = ? AND manufacturer = ?
       AND (expires_at IS NULL OR expires_at > ?)`,
      [partNumber, manufacturer, now]
    );

    if (!row) return null;

    return this.rowToComponentSpecs(row);
  }

  /**
   * Get all cached components by category.
   */
  async getByCategory(category: ComponentCategory): Promise<ComponentSpecs[]> {
    const now = Date.now();

    const rows = await db.query<ComponentCacheRow>(
      `SELECT * FROM ${TABLES.COMPONENT_CACHE}
       WHERE category = ? AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY updated_at DESC`,
      [category, now]
    );

    return rows.map((row) => this.rowToComponentSpecs(row));
  }

  /**
   * Search for components by partial part number match.
   */
  async search(query: string, limit = 20): Promise<ComponentSpecs[]> {
    const now = Date.now();
    const searchPattern = `%${query}%`;

    const rows = await db.query<ComponentCacheRow>(
      `SELECT * FROM ${TABLES.COMPONENT_CACHE}
       WHERE (part_number LIKE ? OR manufacturer LIKE ?)
       AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY
         CASE WHEN part_number = ? THEN 0
              WHEN part_number LIKE ? THEN 1
              ELSE 2 END,
         updated_at DESC
       LIMIT ?`,
      [searchPattern, searchPattern, now, query, `${query}%`, limit]
    );

    return rows.map((row) => this.rowToComponentSpecs(row));
  }

  /**
   * Cache component specs for future offline use.
   */
  async cache(component: ComponentSpecs): Promise<void> {
    const now = Date.now();
    const expiresAt = now + CACHE_TTL.COMPONENT_SPECS;

    await db.run(
      `INSERT INTO ${TABLES.COMPONENT_CACHE}
       (part_number, manufacturer, category, specs_json, source_type,
        source_url, source_confidence, datasheet_url, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(part_number, manufacturer) DO UPDATE SET
         specs_json = excluded.specs_json,
         source_type = excluded.source_type,
         source_url = excluded.source_url,
         source_confidence = excluded.source_confidence,
         datasheet_url = excluded.datasheet_url,
         updated_at = excluded.updated_at,
         expires_at = excluded.expires_at`,
      [
        component.partNumber,
        component.manufacturer,
        component.category,
        JSON.stringify(component.specs),
        component.source.type,
        component.source.url ?? null,
        component.source.confidence,
        component.datasheetUrl ?? null,
        now,
        now,
        expiresAt,
      ]
    );
  }

  /**
   * Cache multiple components in a single transaction.
   */
  async cacheMany(components: ComponentSpecs[]): Promise<void> {
    await db.transaction(async () => {
      for (const component of components) {
        await this.cache(component);
      }
    });
  }

  /**
   * Remove expired cache entries.
   */
  async cleanExpired(): Promise<number> {
    const now = Date.now();
    const result = await db.run(
      `DELETE FROM ${TABLES.COMPONENT_CACHE} WHERE expires_at IS NOT NULL AND expires_at < ?`,
      [now]
    );
    return result.changes;
  }

  /**
   * Clear all cached components.
   */
  async clearAll(): Promise<void> {
    await db.run(`DELETE FROM ${TABLES.COMPONENT_CACHE}`);
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<{
    totalCount: number;
    expiredCount: number;
    byCategory: Record<string, number>;
  }> {
    const now = Date.now();

    const totalResult = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.COMPONENT_CACHE}`
    );

    const expiredResult = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.COMPONENT_CACHE}
       WHERE expires_at IS NOT NULL AND expires_at < ?`,
      [now]
    );

    const categoryResults = await db.query<{ category: string; count: number }>(
      `SELECT category, COUNT(*) as count FROM ${TABLES.COMPONENT_CACHE}
       WHERE expires_at IS NULL OR expires_at > ?
       GROUP BY category`,
      [now]
    );

    const byCategory: Record<string, number> = {};
    for (const row of categoryResults) {
      byCategory[row.category] = row.count;
    }

    return {
      totalCount: totalResult?.count ?? 0,
      expiredCount: expiredResult?.count ?? 0,
      byCategory,
    };
  }

  /**
   * Convert database row to ComponentSpecs type.
   */
  private rowToComponentSpecs(row: ComponentCacheRow): ComponentSpecs {
    const source: DataSource = {
      type: row.source_type as DataSource['type'],
      url: row.source_url ?? undefined,
      retrievedAt: row.updated_at,
      confidence: row.source_confidence,
    };

    return {
      partNumber: row.part_number,
      manufacturer: row.manufacturer,
      category: row.category as ComponentCategory,
      specs: JSON.parse(row.specs_json),
      source,
      datasheetUrl: row.datasheet_url ?? null,
      lastUpdated: row.updated_at,
    };
  }
}

// Export singleton instance
export const componentCache = new ComponentCacheRepository();
