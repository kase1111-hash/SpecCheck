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
  JWT_SECRET: string;
  ADMIN_API_KEY?: string; // Optional admin API key for elevated access
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  DATASHEET: 60 * 60 * 24, // 24 hours
} as const;
