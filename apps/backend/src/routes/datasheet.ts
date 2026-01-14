/**
 * Datasheet Routes
 *
 * Endpoints for component specification lookup.
 *
 * GET  /api/datasheet/:partNumber - Get specs for a part
 * POST /api/datasheet/search      - Search datasheets by query
 * POST /api/datasheet/identify    - Identify part from OCR text
 */

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import type { SearchRequest, IdentifyRequest } from './types';

export const datasheetRoutes = new Hono<AppEnv>();

/**
 * Get datasheet by part number
 */
datasheetRoutes.get('/:partNumber', async (c) => {
  const partNumber = c.req.param('partNumber');
  const service = c.get('datasheetService');

  const datasheet = await service.getByPartNumber(partNumber);

  if (!datasheet) {
    return c.json({ error: 'Datasheet not found' }, 404);
  }

  return c.json(datasheet);
});

/**
 * Search datasheets
 */
datasheetRoutes.post('/search', async (c) => {
  const body = await c.req.json<SearchRequest>();
  const service = c.get('datasheetService');

  if (!body.query || body.query.trim().length === 0) {
    return c.json({ error: 'Query is required' }, 400);
  }

  const matches = await service.search(body.query, body.category);

  return c.json({ matches });
});

/**
 * Identify component from OCR text
 */
datasheetRoutes.post('/identify', async (c) => {
  const body = await c.req.json<IdentifyRequest>();
  const service = c.get('datasheetService');

  if (!body.textLines || body.textLines.length === 0) {
    return c.json({ error: 'Text lines are required' }, 400);
  }

  const result = await service.identify(body.textLines, body.categoryHint);

  return c.json(result);
});
