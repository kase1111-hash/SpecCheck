/**
 * Authentication Middleware
 *
 * Provides authentication for API endpoints using API keys or JWT tokens.
 * Also includes anonymous session tracking for community submissions.
 */

import type { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import type { AppEnv } from '../index';

/**
 * Authentication result
 */
export interface AuthResult {
  /** Whether the request is authenticated */
  authenticated: boolean;
  /** User ID if authenticated */
  userId: string | null;
  /** Session ID for anonymous users */
  sessionId: string;
  /** Authentication method used */
  method: 'api_key' | 'jwt' | 'session' | 'none';
}

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate API key format
 */
function isValidApiKeyFormat(key: string): boolean {
  // API keys should be 32+ characters, alphanumeric with dashes
  return /^[a-zA-Z0-9\-_]{32,}$/.test(key);
}

/**
 * Verify API key against stored keys
 * In production, this would check against a database or KV store
 */
async function verifyApiKey(
  c: Context<AppEnv>,
  apiKey: string
): Promise<{ valid: boolean; userId: string | null }> {
  // For now, check against environment variable for admin API key
  // In production, you'd check against a database of API keys
  const adminKey = c.env?.ADMIN_API_KEY;

  if (adminKey && apiKey === adminKey) {
    return { valid: true, userId: 'admin' };
  }

  // Check KV store for user API keys
  const kv = c.env?.DATASHEET_CACHE;
  if (kv) {
    try {
      const keyData = await kv.get(`apikey:${apiKey}`, 'json') as { userId: string } | null;
      if (keyData) {
        return { valid: true, userId: keyData.userId };
      }
    } catch (error) {
      console.error('[Auth] KV lookup error:', error);
    }
  }

  return { valid: false, userId: null };
}

/**
 * Parse and verify JWT token using cryptographic signature verification
 */
async function verifyJwt(
  c: Context<AppEnv>,
  token: string
): Promise<{ valid: boolean; userId: string | null }> {
  try {
    const secret = c.env?.JWT_SECRET;
    if (!secret) {
      console.error('[Auth] JWT_SECRET not configured — rejecting token');
      return { valid: false, userId: null };
    }

    // verify() checks structure, signature, and expiration
    const payload = await verify(token, secret, 'HS256');

    return {
      valid: true,
      userId: (payload.sub as string) || (payload.userId as string) || null,
    };
  } catch {
    return { valid: false, userId: null };
  }
}

/**
 * Extract authentication from request
 */
async function extractAuth(c: Context<AppEnv>): Promise<AuthResult> {
  const authHeader = c.req.header('Authorization');
  const apiKeyHeader = c.req.header('X-API-Key');
  const sessionCookie = c.req.header('Cookie')?.match(/speccheck_session=([^;]+)/)?.[1];

  // Try API key authentication
  if (apiKeyHeader && isValidApiKeyFormat(apiKeyHeader)) {
    const result = await verifyApiKey(c, apiKeyHeader);
    if (result.valid) {
      return {
        authenticated: true,
        userId: result.userId,
        sessionId: generateSessionId(),
        method: 'api_key',
      };
    }
  }

  // Try Bearer token (JWT) authentication
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const result = await verifyJwt(c, token);
    if (result.valid) {
      return {
        authenticated: true,
        userId: result.userId,
        sessionId: generateSessionId(),
        method: 'jwt',
      };
    }
  }

  // Use or create session ID for anonymous users
  const sessionId = sessionCookie || generateSessionId();

  return {
    authenticated: false,
    userId: null,
    sessionId,
    method: 'session',
  };
}

/**
 * Authentication middleware - extracts and validates auth
 * Sets auth info on context for downstream handlers
 */
export async function auth(c: Context<AppEnv>, next: Next) {
  const authResult = await extractAuth(c);

  // Set auth info on context
  c.set('auth', authResult);

  // Set session cookie if not present
  if (authResult.method === 'session' && !c.req.header('Cookie')?.includes('speccheck_session')) {
    c.header('Set-Cookie', `speccheck_session=${authResult.sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
  }

  await next();
}

/**
 * Require authentication middleware
 * Returns 401 if not authenticated
 */
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const authResult = await extractAuth(c);

  if (!authResult.authenticated) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid API key or token.',
      },
      401
    );
  }

  c.set('auth', authResult);
  await next();
}

/**
 * Optional authentication middleware
 * Extracts auth if present but doesn't require it
 * Good for endpoints that behave differently for authenticated users
 */
export async function optionalAuth(c: Context<AppEnv>, next: Next) {
  const authResult = await extractAuth(c);
  c.set('auth', authResult);

  // Set session cookie
  if (!c.req.header('Cookie')?.includes('speccheck_session')) {
    c.header('Set-Cookie', `speccheck_session=${authResult.sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
  }

  await next();
}

/**
 * Spam protection middleware for submissions
 * Requires either authentication or passes basic spam checks
 */
export async function spamProtection(c: Context<AppEnv>, next: Next) {
  const authResult = await extractAuth(c);

  // Authenticated users bypass spam checks
  if (authResult.authenticated) {
    c.set('auth', authResult);
    await next();
    return;
  }

  // For anonymous users, apply additional checks
  const userAgent = c.req.header('User-Agent') || '';
  const referer = c.req.header('Referer') || '';

  // Basic bot detection
  const suspiciousBotPatterns = [
    /^$/,                    // Empty user agent
    /curl|wget|python/i,    // Common scripting tools
    /bot|crawler|spider/i,  // Known bot patterns
  ];

  const isSuspicious = suspiciousBotPatterns.some((pattern) => pattern.test(userAgent));

  if (isSuspicious) {
    // Require honeypot field check or CAPTCHA
    // For now, just add a warning header
    c.header('X-Spam-Warning', 'Suspicious request detected');
  }

  // Check for rapid submissions from same session
  const kv = c.env?.DATASHEET_CACHE;
  if (kv) {
    const submissionKey = `submission:${authResult.sessionId}`;
    const lastSubmission = await kv.get(submissionKey);

    if (lastSubmission) {
      const lastTime = parseInt(lastSubmission, 10);
      const cooldownMs = 30000; // 30 seconds between submissions

      if (Date.now() - lastTime < cooldownMs) {
        return c.json(
          {
            error: 'Too Many Submissions',
            message: `Please wait ${Math.ceil((cooldownMs - (Date.now() - lastTime)) / 1000)} seconds before submitting again.`,
          },
          429
        );
      }
    }

    // Record this submission attempt
    await kv.put(submissionKey, Date.now().toString(), { expirationTtl: 60 });
  }

  c.set('auth', authResult);
  await next();
}

/**
 * Get auth result from context
 */
export function getAuth(c: Context<AppEnv>): AuthResult {
  return c.get('auth') || {
    authenticated: false,
    userId: null,
    sessionId: 'unknown',
    method: 'none',
  };
}
