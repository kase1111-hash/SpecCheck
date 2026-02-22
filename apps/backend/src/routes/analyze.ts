/**
 * Analyze Routes
 *
 * Endpoints for LLM-powered claim analysis.
 *
 * POST /api/analyze/claim - Analyze a claim against components
 */

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import type { AnalyzeRequest } from './types';

export const analyzeRoutes = new Hono<AppEnv>();

/**
 * Analyze a claim against detected components
 */
analyzeRoutes.post('/claim', async (c) => {
  const body = await c.req.json<AnalyzeRequest>();
  const service = c.get('llmService');

  // Validate request
  if (!body.claim || typeof body.claim.value !== 'number') {
    return c.json({ error: 'Invalid claim format' }, 400);
  }

  if (!body.components || body.components.length === 0) {
    return c.json({ error: 'At least one component is required' }, 400);
  }

  try {
    const result = await service.analyzeClaim(body);
    return c.json(result);
  } catch (error) {
    console.error('Analyze claim failed:', error);
    return c.json(
      {
        error: 'Analysis service unavailable',
        message: 'The analysis service is temporarily unavailable. Please try again later.',
        retryable: true,
      },
      503
    );
  }
});
