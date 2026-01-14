import * as SQLite from 'expo-sqlite';
import { SCHEMA_VERSION, MIGRATIONS, TABLES } from './schema';

const DATABASE_NAME = 'speccheck.db';

/**
 * Database connection manager with migration support.
 *
 * Uses expo-sqlite's synchronous API for better performance.
 * Implements singleton pattern to ensure single connection.
 */
class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Get the database connection, initializing if needed.
   */
  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    }

    if (!this.initialized) {
      await this.initialize();
    }

    return this.db;
  }

  /**
   * Initialize database with migrations.
   */
  private async initialize(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened');
    }

    // Enable foreign keys
    await this.db.execAsync('PRAGMA foreign_keys = ON');

    // Enable WAL mode for better concurrent read performance
    await this.db.execAsync('PRAGMA journal_mode = WAL');

    // Run migrations
    await this.runMigrations();

    this.initialized = true;
  }

  /**
   * Run pending migrations to update schema.
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) return;

    // Get current schema version
    let currentVersion = 0;
    try {
      const result = await this.db.getFirstAsync<{ version: number }>(
        `SELECT version FROM ${TABLES.SCHEMA_VERSION} ORDER BY version DESC LIMIT 1`
      );
      currentVersion = result?.version ?? 0;
    } catch {
      // Table doesn't exist yet, version is 0
    }

    // Run each migration sequentially
    for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version++) {
      const statements = MIGRATIONS[version];
      if (!statements) continue;

      console.log(`Running migration to version ${version}...`);

      await this.db.withTransactionAsync(async () => {
        for (const statement of statements) {
          await this.db!.execAsync(statement);
        }

        // Update version
        await this.db!.runAsync(
          `INSERT OR REPLACE INTO ${TABLES.SCHEMA_VERSION} (version) VALUES (?)`,
          [version]
        );
      });

      console.log(`Migration to version ${version} complete`);
    }
  }

  /**
   * Execute a single SQL statement with parameters.
   */
  async run(sql: string, params: (string | number | null)[] = []): Promise<SQLite.SQLiteRunResult> {
    const db = await this.getDatabase();
    return db.runAsync(sql, params);
  }

  /**
   * Execute a query and return all results.
   */
  async query<T>(sql: string, params: (string | number | null)[] = []): Promise<T[]> {
    const db = await this.getDatabase();
    return db.getAllAsync<T>(sql, params);
  }

  /**
   * Execute a query and return the first result.
   */
  async queryFirst<T>(sql: string, params: (string | number | null)[] = []): Promise<T | null> {
    const db = await this.getDatabase();
    return db.getFirstAsync<T>(sql, params);
  }

  /**
   * Execute multiple statements in a transaction.
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const db = await this.getDatabase();
    return db.withTransactionAsync(callback);
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Delete the database file (for testing/reset).
   */
  async deleteDatabase(): Promise<void> {
    await this.close();
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  }

  /**
   * Get database file size for storage management.
   */
  async getDatabaseSize(): Promise<number> {
    const db = await this.getDatabase();
    const result = await db.getFirstAsync<{ page_count: number; page_size: number }>(
      'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()'
    );
    return result?.page_count ?? 0;
  }

  /**
   * Vacuum database to reclaim space.
   */
  async vacuum(): Promise<void> {
    const db = await this.getDatabase();
    await db.execAsync('VACUUM');
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();

// Export for direct access when needed
export { DatabaseManager };
