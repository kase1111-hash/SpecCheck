/**
 * Request Body Parsing
 *
 * Shared JSON body reader for route handlers.
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * Read the request body as a JSON object.
 *
 * Malformed JSON and non-object bodies (null, arrays, bare strings) are client
 * errors, so they surface as 400s instead of crashing the handler with a 500.
 */
export async function readJsonBody<T>(c: Context): Promise<T> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch (error) {
    // Only a parse failure is the client's fault here. Anything else, such as
    // bodyLimit aborting an oversized stream, must reach its own handler.
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HTTPException(400, { message: 'Request body must be a JSON object' });
  }

  return body as T;
}
