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

/**
 * Submit a new verification
 */
communityRoutes.post('/submit', async (c) => {
  const body = await c.req.json<SubmitRequest>();
  const storage = c.get('storageService');
  const env = c.env;

  // Validate required fields
  if (!body.productName || body.productName.trim().length === 0) {
    return c.json({ error: 'Product name is required' }, 400);
  }

  if (!body.verdict || body.verdict.trim().length === 0) {
    return c.json({ error: 'Verdict is required' }, 400);
  }

  try {
    // Upload base64 images to R2 if provided
    const imageUrls: string[] = [];
    if (body.images && body.images.length > 0) {
      for (let i = 0; i < body.images.length; i++) {
        const imageData = body.images[i];
        // Check if it's base64 or already a URL
        if (imageData.startsWith('data:') || !imageData.startsWith('http')) {
          const contentType = imageData.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
          const url = await storage.uploadBase64Image(
            imageData,
            `submission-${Date.now()}-${i}.jpg`,
            contentType
          );
          imageUrls.push(url);
        } else {
          // Already a URL, keep as-is
          imageUrls.push(imageData);
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
