/**
 * Datasheet Module
 *
 * Handles component specification retrieval and caching.
 *
 * Responsibilities:
 * - Local SQLite cache for datasheets
 * - Remote API lookup for cache misses
 * - Spec parsing and normalization
 * - Cache invalidation and refresh
 *
 * Exports:
 * - DatasheetCache: Local cache manager
 * - DatasheetAPI: Remote lookup client
 * - getSpecs: Main function to retrieve specs
 * - parseDatasheet: Extract key specs from raw data
 */

export * from './DatasheetCache';
export * from './DatasheetAPI';
export * from './SpecParser';
export * from './types';
