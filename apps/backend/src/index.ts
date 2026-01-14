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
import { datasheetRoutes } from './routes/datasheet';
import { analyzeRoutes } from './routes/analyze';
import { communityRoutes } from './routes/community';
import { getSupabase } from './db/client';
import { DatasheetService } from './services/DatasheetService';
import { LLMService } from './services/LLMService';
import { StorageService } from './services/StorageService';
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
  };
};

const app = new Hono<AppEnv>();

// CORS middleware
app.use('/*', cors({
  origin: ['http://localhost:8081', 'https://speccheck.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

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

// Mount routes
app.route('/api/datasheet', datasheetRoutes);
app.route('/api/analyze', analyzeRoutes);
app.route('/api/community', communityRoutes);

export default app;
