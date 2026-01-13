/**
 * Analyze Routes
 *
 * Endpoints for LLM-powered claim analysis.
 *
 * POST /api/analyze/claim - Analyze a claim against components
 */

import { Hono } from 'hono';
import type { AnalyzeRequest, AnalyzeResponse } from './types';

export const analyzeRoutes = new Hono();

/**
 * Analyze a claim against detected components
 */
analyzeRoutes.post('/claim', async (c) => {
  const body = await c.req.json<AnalyzeRequest>();

  // TODO: Implement LLM analysis
  // 1. Build prompt with component specs and claim
  // 2. Call Claude API
  // 3. Parse structured response
  // 4. Return verdict

  return c.json({
    verdict: 'uncertain',
    maxPossible: 0,
    unit: '',
    reasoning: 'Analysis not yet implemented',
    chain: [],
  } satisfies AnalyzeResponse);
});
