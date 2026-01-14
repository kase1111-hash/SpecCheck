/**
 * Database module for SpecCheck
 *
 * Provides SQLite-based local storage for:
 * - Component specs cache (offline access)
 * - Scan history with verdicts
 * - User-saved components with notes
 * - Datasheet cache for parsed PDFs
 */

// Core database
export { db, DatabaseManager } from './Database';
export { SCHEMA_VERSION, TABLES, CACHE_TTL } from './schema';

// Repositories
export { componentCache, ComponentCacheRepository } from './repositories/ComponentCacheRepository';
export {
  scanHistory,
  ScanHistoryRepository,
  type StoredClaim,
  type ScanComponent,
  type ScanHistoryEntry,
  type ScanHistorySummary,
} from './repositories/ScanHistoryRepository';
export {
  savedComponents,
  SavedComponentsRepository,
  type SavedComponentEntry,
} from './repositories/SavedComponentsRepository';
export {
  datasheetCache,
  DatasheetCacheRepository,
  type CachedDatasheet,
} from './repositories/DatasheetCacheRepository';

// React hooks
export {
  useComponentSearch,
  useCachedComponent,
  useScanHistory,
  useScanEntry,
  useSavedComponents,
  useIsComponentSaved,
  useDatabaseStats,
  useCacheCleanup,
} from './hooks';
