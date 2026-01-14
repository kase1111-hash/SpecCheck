/**
 * Cloudflare Workers Environment Bindings
 *
 * Type definitions for KV, R2, and environment variables.
 */

export interface Env {
  // KV Namespace for caching datasheets
  DATASHEET_CACHE: KVNamespace;

  // R2 Bucket for image storage
  IMAGES: R2Bucket;

  // Environment variables
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ANTHROPIC_API_KEY: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  DATASHEET: 60 * 60 * 24, // 24 hours
  SEARCH_RESULTS: 60 * 5, // 5 minutes
} as const;
