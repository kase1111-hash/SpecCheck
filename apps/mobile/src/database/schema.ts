/**
 * Database Schema for SpecCheck
 *
 * Uses expo-sqlite with synchronous API for better performance.
 * All tables use INTEGER PRIMARY KEY for rowid optimization.
 */

export const SCHEMA_VERSION = 1;

/**
 * Migration scripts indexed by version number.
 * Each migration upgrades from version N-1 to version N.
 */
export const MIGRATIONS: Record<number, string[]> = {
  1: [
    // Schema version tracking
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )`,

    // Component specs cache
    // Stores fetched component specifications for offline access
    `CREATE TABLE IF NOT EXISTS component_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_number TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      category TEXT NOT NULL,
      specs_json TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_url TEXT,
      source_confidence REAL NOT NULL DEFAULT 0.0,
      datasheet_url TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      expires_at INTEGER,
      UNIQUE(part_number, manufacturer)
    )`,

    // Index for fast part number lookups
    `CREATE INDEX IF NOT EXISTS idx_component_part_number
     ON component_cache(part_number)`,

    // Index for category filtering
    `CREATE INDEX IF NOT EXISTS idx_component_category
     ON component_cache(category)`,

    // Scan history
    // Stores results of claim verification scans
    `CREATE TABLE IF NOT EXISTS scan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_raw TEXT NOT NULL,
      claim_value REAL,
      claim_unit TEXT,
      claim_type TEXT,
      verdict_type TEXT NOT NULL,
      verdict_confidence REAL NOT NULL,
      verdict_summary TEXT,
      verdict_explanation TEXT,
      verdict_json TEXT NOT NULL,
      component_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )`,

    // Index for recent scans
    `CREATE INDEX IF NOT EXISTS idx_scan_created_at
     ON scan_history(created_at DESC)`,

    // Scan components junction table
    // Links scans to the components that were detected
    `CREATE TABLE IF NOT EXISTS scan_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_id INTEGER NOT NULL,
      part_number TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      category TEXT NOT NULL,
      bounding_box_json TEXT,
      confidence REAL NOT NULL DEFAULT 0.0,
      FOREIGN KEY (scan_id) REFERENCES scan_history(id) ON DELETE CASCADE
    )`,

    // Index for scan component lookups
    `CREATE INDEX IF NOT EXISTS idx_scan_components_scan_id
     ON scan_components(scan_id)`,

    // Saved components
    // User-bookmarked components for quick reference
    `CREATE TABLE IF NOT EXISTS saved_components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_number TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      category TEXT NOT NULL,
      specs_json TEXT NOT NULL,
      notes TEXT,
      tags TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(part_number, manufacturer)
    )`,

    // Datasheet cache
    // Stores parsed datasheet content for offline access
    `CREATE TABLE IF NOT EXISTS datasheet_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      part_number TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      parsed_specs_json TEXT,
      raw_text TEXT,
      page_count INTEGER,
      file_size INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      expires_at INTEGER
    )`,

    // Index for URL lookups
    `CREATE INDEX IF NOT EXISTS idx_datasheet_url
     ON datasheet_cache(url)`,

    // Offline component bundle metadata
    // Tracks bundled component data versions
    `CREATE TABLE IF NOT EXISTS offline_bundle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_version TEXT NOT NULL,
      component_count INTEGER NOT NULL,
      size_bytes INTEGER NOT NULL,
      downloaded_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      is_active INTEGER NOT NULL DEFAULT 0
    )`,

    // User consent log
    // Tracks privacy consent for audit purposes
    `CREATE TABLE IF NOT EXISTS consent_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consent_type TEXT NOT NULL,
      granted INTEGER NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      version TEXT NOT NULL
    )`,
  ],
};

/**
 * Table names for type safety
 */
export const TABLES = {
  SCHEMA_VERSION: 'schema_version',
  COMPONENT_CACHE: 'component_cache',
  SCAN_HISTORY: 'scan_history',
  SCAN_COMPONENTS: 'scan_components',
  SAVED_COMPONENTS: 'saved_components',
  DATASHEET_CACHE: 'datasheet_cache',
  OFFLINE_BUNDLE: 'offline_bundle',
  CONSENT_LOG: 'consent_log',
} as const;

/**
 * Cache expiration times in milliseconds
 */
export const CACHE_TTL = {
  COMPONENT_SPECS: 7 * 24 * 60 * 60 * 1000, // 7 days
  DATASHEET: 30 * 24 * 60 * 60 * 1000, // 30 days
  SCAN_HISTORY_MAX: 100, // Keep last 100 scans
} as const;
