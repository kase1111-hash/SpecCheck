/**
 * DatasheetCache
 *
 * Local SQLite cache for component datasheets.
 * Reduces API calls and enables offline functionality.
 */

import type {
  ComponentSpecs,
  DatasheetCacheEntry,
  SpecValue,
  ComponentCategory,
} from '@speccheck/shared-types';

/** Cache TTL in milliseconds (30 days) */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Database interface type */
interface SQLiteDatabase {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  runAsync(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

/** Database row type */
interface DatasheetRow {
  part_number: string;
  manufacturer: string;
  category: string;
  specs_json: string;
  datasheet_url: string | null;
  fetched_at: number;
  expires_at: number;
}

/**
 * Datasheet cache service
 */
export class DatasheetCache {
  private db: SQLiteDatabase | null = null;
  private initialized = false;

  /**
   * Initialize the cache database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import to handle cases where expo-sqlite isn't available
      const SQLite = await import('expo-sqlite');
      this.db = await SQLite.openDatabaseAsync('speccheck.db');
      await this.createTables();
      this.initialized = true;
      console.log('[DatasheetCache] Initialized with SQLite');
    } catch (error) {
      console.warn('[DatasheetCache] SQLite not available, using in-memory fallback:', error);
      this.initialized = true;
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS datasheets (
        part_number TEXT PRIMARY KEY,
        manufacturer TEXT NOT NULL,
        category TEXT NOT NULL,
        specs_json TEXT NOT NULL,
        datasheet_url TEXT,
        fetched_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_datasheets_category
        ON datasheets(category);

      CREATE INDEX IF NOT EXISTS idx_datasheets_expires
        ON datasheets(expires_at);

      CREATE TABLE IF NOT EXISTS component_patterns (
        pattern TEXT PRIMARY KEY,
        part_number TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        category TEXT NOT NULL,
        priority INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_patterns_category
        ON component_patterns(category);
    `);
  }

  /**
   * Get specs from cache
   */
  async get(partNumber: string): Promise<ComponentSpecs | null> {
    await this.ensureInitialized();

    // Try SQLite first
    if (this.db) {
      try {
        const row = await this.db.getFirstAsync<DatasheetRow>(
          'SELECT * FROM datasheets WHERE part_number = ? AND expires_at > ?',
          [partNumber, Date.now()]
        );

        if (row) {
          return this.rowToComponentSpecs(row);
        }
      } catch (error) {
        console.error('[DatasheetCache] SQLite query error:', error);
      }
    }

    // Fallback to in-memory mock data for development
    return this.getMockData(partNumber);
  }

  /**
   * Store specs in cache
   */
  async set(specs: ComponentSpecs): Promise<void> {
    await this.ensureInitialized();

    const now = Date.now();
    const expiresAt = now + CACHE_TTL_MS;

    if (this.db) {
      try {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO datasheets
           (part_number, manufacturer, category, specs_json, datasheet_url, fetched_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            specs.partNumber,
            specs.manufacturer,
            specs.category,
            JSON.stringify(specs.specs),
            specs.datasheetUrl,
            now,
            expiresAt,
          ]
        );
        console.log(`[DatasheetCache] Cached ${specs.partNumber} in SQLite`);
        return;
      } catch (error) {
        console.error('[DatasheetCache] SQLite insert error:', error);
      }
    }

    console.log(`[DatasheetCache] Cached ${specs.partNumber} (in-memory only)`);
  }

  /**
   * Search cache by part number pattern
   */
  async search(query: string, limit = 10): Promise<ComponentSpecs[]> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const rows = await this.db.getAllAsync<DatasheetRow>(
          `SELECT * FROM datasheets
           WHERE part_number LIKE ? AND expires_at > ?
           ORDER BY fetched_at DESC
           LIMIT ?`,
          [`%${query}%`, Date.now(), limit]
        );

        return rows.map((row) => this.rowToComponentSpecs(row));
      } catch (error) {
        console.error('[DatasheetCache] SQLite search error:', error);
      }
    }

    return [];
  }

  /**
   * Remove expired entries
   */
  async cleanup(): Promise<number> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const result = await this.db.runAsync(
          'DELETE FROM datasheets WHERE expires_at < ?',
          [Date.now()]
        );
        console.log(`[DatasheetCache] Cleaned up ${result.changes} expired entries`);
        return result.changes;
      } catch (error) {
        console.error('[DatasheetCache] SQLite cleanup error:', error);
      }
    }

    return 0;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        await this.db.runAsync('DELETE FROM datasheets');
        console.log('[DatasheetCache] Cleared SQLite cache');
        return;
      } catch (error) {
        console.error('[DatasheetCache] SQLite clear error:', error);
      }
    }

    console.log('[DatasheetCache] Cleared (in-memory)');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ totalEntries: number; expiredEntries: number }> {
    await this.ensureInitialized();

    if (this.db) {
      try {
        const total = await this.db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM datasheets'
        );
        const expired = await this.db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM datasheets WHERE expires_at < ?',
          [Date.now()]
        );

        return {
          totalEntries: total?.count || 0,
          expiredEntries: expired?.count || 0,
        };
      } catch (error) {
        console.error('[DatasheetCache] SQLite stats error:', error);
      }
    }

    return { totalEntries: 0, expiredEntries: 0 };
  }

  /**
   * Convert database row to ComponentSpecs
   */
  private rowToComponentSpecs(row: DatasheetRow): ComponentSpecs {
    return {
      partNumber: row.part_number,
      manufacturer: row.manufacturer,
      category: row.category as ComponentCategory,
      source: 'cache',
      specs: JSON.parse(row.specs_json),
      datasheetUrl: row.datasheet_url,
      lastUpdated: row.fetched_at,
    };
  }

  /**
   * Get mock data for development
   */
  private getMockData(partNumber: string): ComponentSpecs | null {
    const mockDatabase: Record<string, ComponentSpecs> = {
      'XM-L2': {
        partNumber: 'XM-L2',
        manufacturer: 'Cree',
        category: 'led',
        source: 'cache',
        specs: {
          luminous_flux: { value: 1052, unit: 'lm', conditions: 'at 3000mA, Tj=25°C', min: 900, max: 1100, typical: 1052 },
          forward_voltage: { value: 3.1, unit: 'V', conditions: 'at 3000mA', min: 2.9, max: 3.5, typical: 3.1 },
          max_current: { value: 3000, unit: 'mA', conditions: 'absolute maximum', min: null, max: 3000, typical: null },
          thermal_resistance: { value: 2.5, unit: '°C/W', conditions: 'junction to solder point', min: null, max: null, typical: 2.5 },
        },
        datasheetUrl: 'https://cree-led.com/media/documents/XLampXML2.pdf',
        lastUpdated: Date.now(),
      },
      'PT4115': {
        partNumber: 'PT4115',
        manufacturer: 'PowTech',
        category: 'led_driver',
        source: 'cache',
        specs: {
          max_output_current: { value: 1200, unit: 'mA', conditions: null, min: null, max: 1200, typical: null },
          input_voltage_min: { value: 6, unit: 'V', conditions: null, min: 6, max: null, typical: null },
          input_voltage_max: { value: 30, unit: 'V', conditions: null, min: null, max: 30, typical: null },
          efficiency: { value: 97, unit: '%', conditions: 'at optimal load', min: null, max: null, typical: 97 },
          switching_freq: { value: 1000, unit: 'kHz', conditions: null, min: null, max: null, typical: 1000 },
        },
        datasheetUrl: null,
        lastUpdated: Date.now(),
      },
      'INR18650-35E': {
        partNumber: 'INR18650-35E',
        manufacturer: 'Samsung SDI',
        category: 'battery_cell',
        source: 'cache',
        specs: {
          nominal_capacity: { value: 3500, unit: 'mAh', conditions: 'at 0.2C discharge', min: 3350, max: null, typical: 3500 },
          nominal_voltage: { value: 3.6, unit: 'V', conditions: null, min: null, max: null, typical: 3.6 },
          max_continuous_discharge: { value: 8, unit: 'A', conditions: 'continuous', min: null, max: 8, typical: null },
          max_pulse_discharge: { value: 13, unit: 'A', conditions: 'pulse', min: null, max: 13, typical: null },
          internal_resistance: { value: 25, unit: 'mΩ', conditions: 'at 1kHz', min: null, max: null, typical: 25 },
        },
        datasheetUrl: null,
        lastUpdated: Date.now(),
      },
    };

    return mockDatabase[partNumber] || null;
  }
}

/**
 * Singleton instance
 */
let cacheInstance: DatasheetCache | null = null;

/**
 * Get the datasheet cache instance
 */
export function getDatasheetCache(): DatasheetCache {
  if (!cacheInstance) {
    cacheInstance = new DatasheetCache();
  }
  return cacheInstance;
}
