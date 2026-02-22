/**
 * Community Routes
 *
 * Endpoints for community submissions and search.
 *
 * POST /api/community/submit       - Submit a verification
 * GET  /api/community/search       - Search verifications
 * GET  /api/community/listing/:hash - Get verification by listing URL hash
 * GET  /api/community/recent       - Get recent submissions
 * GET  /api/community/:id          - Get submission by ID
 */

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import type { SubmitRequest } from './types';
import { getSupabase } from '../db/client';
import {
  createSubmission,
  searchSubmissions,
  getRecentSubmissions,
  getSubmissionById,
} from '../db/submissions';

export const communityRoutes = new Hono<AppEnv>();

const VALID_VERDICTS = ['plausible', 'impossible', 'uncertain'];
const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_LISTING_URL_LENGTH = 2048;
const MAX_IMAGES = 10;

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Submit a new verification
 */
communityRoutes.post('/submit', async (c) => {
  const body = await c.req.json<SubmitRequest>();
  const storage = c.get('storageService');
  const env = c.env;

  // Validate required fields with length limits
  if (!body.productName || body.productName.trim().length === 0) {
    return c.json({ error: 'Product name is required' }, 400);
  }
  if (body.productName.length > MAX_PRODUCT_NAME_LENGTH) {
    return c.json({ error: `Product name too long (max ${MAX_PRODUCT_NAME_LENGTH} characters)` }, 400);
  }

  if (!body.verdict || body.verdict.trim().length === 0) {
    return c.json({ error: 'Verdict is required' }, 400);
  }
  if (!VALID_VERDICTS.includes(body.verdict.trim())) {
    return c.json({ error: `Verdict must be one of: ${VALID_VERDICTS.join(', ')}` }, 400);
  }

  if (body.listingUrl) {
    if (body.listingUrl.length > MAX_LISTING_URL_LENGTH) {
      return c.json({ error: `Listing URL too long (max ${MAX_LISTING_URL_LENGTH} characters)` }, 400);
    }
    if (!isValidHttpUrl(body.listingUrl)) {
      return c.json({ error: 'Invalid listing URL' }, 400);
    }
  }

  if (body.images && body.images.length > MAX_IMAGES) {
    return c.json({ error: `Too many images (max ${MAX_IMAGES})` }, 400);
  }

  // Sanitize string fields
  body.productName = body.productName.trim().slice(0, MAX_PRODUCT_NAME_LENGTH);
  body.verdict = body.verdict.trim();

  try {
    // Upload base64 images to R2 — only accept base64 data, reject external URLs (SSRF protection)
    const imageUrls: string[] = [];
    if (body.images && body.images.length > 0) {
      for (let i = 0; i < body.images.length; i++) {
        const imageData = body.images[i];
        if (imageData.startsWith('data:') || !imageData.startsWith('http')) {
          const contentType = imageData.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
          const url = await storage.uploadBase64Image(
            imageData,
            `submission-${Date.now()}-${i}.jpg`,
            contentType
          );
          imageUrls.push(url);
        } else {
          // Reject external URLs to prevent SSRF
          console.warn('[Community] Rejected external image URL in submission');
        }
      }
    }

    // Create submission in database
    const db = getSupabase(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const submission = await createSubmission(db, {
      ...body,
      images: imageUrls,
    });

    return c.json({
      id: submission.id,
      success: true,
      message: 'Submission created successfully',
    });
  } catch (error) {
    console.error('Failed to create submission:', error);
    return c.json({
      id: '',
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create submission',
    }, 500);
  }
});

/**
 * Search community verifications
 */
communityRoutes.get('/search', async (c) => {
  const query = c.req.query('q') || '';
  const category = c.req.query('category');
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const env = c.env;

  try {
    const db = getSupabase(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const results = await searchSubmissions(db, query, category, limit, offset);

    return c.json({
      results,
      totalCount: results.length,
      hasMore: results.length === limit,
    });
  } catch (error) {
    console.error('Search failed:', error);
    return c.json({ results: [], totalCount: 0, hasMore: false }, 500);
  }
});

/**
 * Get recent submissions
 */
communityRoutes.get('/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const env = c.env;

  try {
    const db = getSupabase(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const results = await getRecentSubmissions(db, limit, offset);

    return c.json({
      results,
      hasMore: results.length === limit,
    });
  } catch (error) {
    console.error('Failed to fetch recent submissions:', error);
    return c.json({ results: [], hasMore: false }, 500);
  }
});

/**
 * Get verification by listing URL hash
 */
communityRoutes.get('/listing/:urlHash', async (c) => {
  const urlHash = c.req.param('urlHash');
  const env = c.env;

  try {
    const db = getSupabase(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    // Search by URL hash pattern
    const results = await searchSubmissions(db, urlHash, undefined, 10, 0);

    if (results.length === 0) {
      return c.json(null, 404);
    }

    return c.json(results[0]);
  } catch (error) {
    console.error('Failed to fetch submission:', error);
    return c.json(null, 500);
  }
});

/**
 * Get submission by ID
 */
communityRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const env = c.env;

  try {
    const db = getSupabase(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const submission = await getSubmissionById(db, id);

    if (!submission) {
      return c.json({ error: 'Submission not found' }, 404);
    }

    return c.json(submission);
  } catch (error) {
    console.error('Failed to fetch submission:', error);
    return c.json({ error: 'Failed to fetch submission' }, 500);
  }
});
