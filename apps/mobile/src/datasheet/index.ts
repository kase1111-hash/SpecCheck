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
 */

export { DatasheetCache, getDatasheetCache } from './DatasheetCache';
export { DatasheetAPI, getDatasheetAPI } from './DatasheetAPI';
export { SpecRetriever, getSpecRetriever } from './SpecRetriever';
