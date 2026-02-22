/**
 * Request Logger Middleware
 *
 * Structured JSON logging with request correlation IDs.
 */

import type { Context, Next } from 'hono';
import type { AppEnv } from '../index';

export async function requestLogger(c: Context<AppEnv>, next: Next) {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  // Set request ID for downstream use
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  await next();

  const duration = Date.now() - start;
  const log = {
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    userAgent: c.req.header('User-Agent')?.slice(0, 100),
  };

  if (c.res.status >= 500) {
    console.error(JSON.stringify(log));
  } else if (c.res.status >= 400) {
    console.warn(JSON.stringify(log));
  } else {
    console.log(JSON.stringify(log));
  }
}
