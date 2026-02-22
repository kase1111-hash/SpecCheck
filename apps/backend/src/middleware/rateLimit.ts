/**
 * Rate Limiting Middleware
 *
 * Implements sliding window rate limiting for API endpoints.
 * Uses Cloudflare Workers KV for distributed state.
 */

import type { Context, Next } from 'hono';
import type { AppEnv } from '../index';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Optional custom key generator */
  keyGenerator?: (c: Context<AppEnv>) => string;
  /** Skip rate limiting for certain requests */
  skip?: (c: Context<AppEnv>) => boolean;
}

/**
 * Default rate limit configurations by endpoint type
 */
export const RATE_LIMITS = {
  // General API endpoints
  default: {
    maxRequests: 100,
    windowSeconds: 60,
  },
  // Datasheet lookups (read-heavy, cacheable)
  datasheet: {
    maxRequests: 200,
    windowSeconds: 60,
  },
  // LLM-powered analysis (expensive)
  analyze: {
    maxRequests: 20,
    windowSeconds: 60,
  },
  // Community submissions (write operations)
  submit: {
    maxRequests: 10,
    windowSeconds: 60,
  },
  // Search endpoints
  search: {
    maxRequests: 60,
    windowSeconds: 60,
  },
} as const;

/**
 * Get client identifier for rate limiting
 */
function getClientKey(c: Context<AppEnv>): string {
  // Try to get real IP from Cloudflare headers
  const cfConnectingIp = c.req.header('CF-Connecting-IP');
  const xForwardedFor = c.req.header('X-Forwarded-For');
  const xRealIp = c.req.header('X-Real-IP');

  const ip = cfConnectingIp || xForwardedFor?.split(',')[0]?.trim() || xRealIp || 'unknown';

  // Include path prefix for per-endpoint limiting
  const pathPrefix = c.req.path.split('/').slice(0, 4).join('/');

  return `ratelimit:${ip}:${pathPrefix}`;
}

/**
 * Check and update rate limit using KV or memory store
 */
/**
 * Check and update rate limit using KV.
 *
 * Note: KV read-then-write is not atomic. Under extreme concurrency some
 * requests may slip through. For strict rate limiting, migrate to Durable
 * Objects. KV entries auto-expire via expirationTtl — no manual cleanup needed.
 */
async function checkRateLimit(
  c: Context<AppEnv>,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const kv = c.env?.DATASHEET_CACHE;

  if (!kv) {
    // No KV available — fail open but log warning
    console.warn('[RateLimit] KV namespace not available, skipping rate limit');
    return { allowed: true, remaining: config.maxRequests, resetAt: now + windowMs };
  }

  try {
    const stored = await kv.get(key, 'json') as { count: number; windowStart: number } | null;

    let count: number;
    let windowStart: number;

    if (!stored || now - stored.windowStart >= windowMs) {
      count = 1;
      windowStart = now;
    } else {
      count = stored.count + 1;
      windowStart = stored.windowStart;
    }

    // Store with TTL for automatic cleanup — no setInterval needed
    await kv.put(key, JSON.stringify({ count, windowStart }), {
      expirationTtl: config.windowSeconds + 60,
    });

    const resetAt = windowStart + windowMs;
    const remaining = Math.max(0, config.maxRequests - count);

    return {
      allowed: count <= config.maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('[RateLimit] KV error:', error);
    // On KV failure, fail open — allow the request but log
    return { allowed: true, remaining: config.maxRequests, resetAt: now + windowMs };
  }
}

/**
 * Rate limiting middleware factory
 */
export function rateLimit(config: RateLimitConfig = RATE_LIMITS.default) {
  return async (c: Context<AppEnv>, next: Next) => {
    // Check if rate limiting should be skipped
    if (config.skip?.(c)) {
      await next();
      return;
    }

    // Generate rate limit key
    const key = config.keyGenerator?.(c) || getClientKey(c);

    // Check rate limit
    const result = await checkRateLimit(c, key, config);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

    if (!result.allowed) {
      c.header('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000).toString());

      return c.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please wait ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        429
      );
    }

    await next();
  };
}

/**
 * Convenience middleware for different endpoint types
 */
export const rateLimitDatasheet = rateLimit(RATE_LIMITS.datasheet);
export const rateLimitAnalyze = rateLimit(RATE_LIMITS.analyze);
export const rateLimitSubmit = rateLimit(RATE_LIMITS.submit);
export const rateLimitSearch = rateLimit(RATE_LIMITS.search);
export const rateLimitDefault = rateLimit(RATE_LIMITS.default);
