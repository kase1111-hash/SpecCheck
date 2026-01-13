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
import { datasheetRoutes } from './routes/datasheet';
import { analyzeRoutes } from './routes/analyze';
import { communityRoutes } from './routes/community';

const app = new Hono();

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'speccheck-api' }));

// Mount routes
app.route('/api/datasheet', datasheetRoutes);
app.route('/api/analyze', analyzeRoutes);
app.route('/api/community', communityRoutes);

export default app;
