/**
 * SpecCheck Backend API
 *
 * Hono-based API running on Cloudflare Workers.
 *
 * Routes:
 * - /api/datasheet/* - Component datasheet lookup
 * - /api/analyze/* - LLM-powered claim analysis
 * - /api/community/* - Community submissions and search
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { datasheetRoutes } from './routes/datasheet';
import { analyzeRoutes } from './routes/analyze';
import { communityRoutes } from './routes/community';
import { getSupabase } from './db/client';
import { DatasheetService } from './services/DatasheetService';
import { LLMService } from './services/LLMService';
import { StorageService } from './services/StorageService';
import {
  rateLimitDatasheet,
  rateLimitAnalyze,
  rateLimitSubmit,
  rateLimitSearch,
} from './middleware/rateLimit';
import { requireAuth, optionalAuth, spamProtection } from './middleware/auth';
import type { AuthResult } from './middleware/auth';
import { requestLogger } from './middleware/logger';
import type { Env } from './env';

/**
 * Extended Hono context with services
 */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    datasheetService: DatasheetService;
    llmService: LLMService;
    storageService: StorageService;
    auth: AuthResult;
    requestId: string;
  };
};

const app = new Hono<AppEnv>();

// CORS middleware — environment-aware origins
app.use('/*', async (c, next) => {
  const environment = c.env.ENVIRONMENT || 'production';
  const origins: string[] = ['https://speccheck.app'];

  if (environment === 'development') {
    origins.push('http://localhost:8081');
  }

  return cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })(c, next);
});

// Structured request logging
app.use('/*', requestLogger);

// Global body size limit (5MB default). The submit route sets its own, larger
// limit below, and a request has to pass every limit it hits, so skip it here.
const defaultBodyLimit = bodyLimit({ maxSize: 5 * 1024 * 1024 });
app.use('/*', (c, next) =>
  c.req.path === '/api/community/submit' ? next() : defaultBodyLimit(c, next)
);

// Initialize services middleware
app.use('/*', async (c, next) => {
  const env = c.env;

  // Create Supabase client
  const db = getSupabase(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  // Create services
  c.set('datasheetService', new DatasheetService(env.DATASHEET_CACHE, db));
  c.set('llmService', new LLMService(env.ANTHROPIC_API_KEY));
  c.set('storageService', new StorageService(env.IMAGES));

  await next();
});

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'speccheck-api' }));

// Apply rate limiting and auth middleware to specific routes
// Datasheet routes - higher limits for read-heavy operations
app.use('/api/datasheet/*', rateLimitDatasheet);

// Analyze routes - lower limits for expensive LLM operations, auth required
app.use('/api/analyze/*', rateLimitAnalyze);
app.use('/api/analyze/*', requireAuth);

// Community routes - different limits for different operations
app.use('/api/community/search', rateLimitSearch);
app.use('/api/community/search', optionalAuth);
app.use('/api/community/recent', rateLimitSearch);
app.use('/api/community/recent', optionalAuth);

// Submit route: larger body limit for images, spam protection, auth required
app.use('/api/community/submit', bodyLimit({ maxSize: 20 * 1024 * 1024 }));
app.use('/api/community/submit', rateLimitSubmit);
app.use('/api/community/submit', spamProtection);
app.use('/api/community/submit', requireAuth);

// Mount routes
app.route('/api/datasheet', datasheetRoutes);
app.route('/api/analyze', analyzeRoutes);
app.route('/api/community', communityRoutes);

// Anything a handler throws comes back as JSON instead of Hono's plain-text 500
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // bodyLimit attaches its own 413 response; our own throws carry a message
    return err.res ? err.getResponse() : c.json({ error: err.message }, err.status);
  }

  console.error(`[${c.get('requestId')}] Unhandled error:`, err);
  return c.json(
    {
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.',
      requestId: c.get('requestId'),
    },
    500
  );
});

export default app;
