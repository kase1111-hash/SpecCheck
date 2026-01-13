/**
 * Community Routes
 *
 * Endpoints for community submissions and search.
 *
 * POST /api/community/submit       - Submit a verification
 * GET  /api/community/search       - Search verifications
 * GET  /api/community/listing/:hash - Get verification by listing URL hash
 */

import { Hono } from 'hono';
import type { SubmitRequest, CommunitySearchParams } from './types';

export const communityRoutes = new Hono();

/**
 * Submit a new verification
 */
communityRoutes.post('/submit', async (c) => {
  const body = await c.req.json<SubmitRequest>();
  // TODO: Implement submission
  // 1. Validate input
  // 2. Upload images to R2
  // 3. Store in Supabase
  // 4. Return submission ID
  return c.json({ id: '', success: false, message: 'Not implemented' });
});

/**
 * Search community verifications
 */
communityRoutes.get('/search', async (c) => {
  const query = c.req.query('q') || '';
  const category = c.req.query('category');
  // TODO: Implement search
  return c.json({ results: [], totalCount: 0, hasMore: false });
});

/**
 * Get verification by listing URL hash
 */
communityRoutes.get('/listing/:urlHash', async (c) => {
  const urlHash = c.req.param('urlHash');
  // TODO: Implement lookup
  return c.json(null);
});
