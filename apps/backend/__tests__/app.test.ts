/**
 * App Integration Tests
 *
 * Drives the real Hono app through app.request() to check error handling
 * and body limits end to end, with an in-memory KV and no network.
 */

import app from '../src/index';

const ADMIN_KEY = 'admin-key-0123456789abcdef0123456789abcdef';
const MB = 1024 * 1024;

function createKV(overrides: Partial<Record<'get' | 'put', jest.Mock>> = {}) {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (key: string, type?: string) => {
      const value = store.get(key);
      if (value === undefined) return null;
      return type === 'json' ? JSON.parse(value) : value;
    }),
    put: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    ...overrides,
  };
}

function createEnv(kv = createKV()) {
  return {
    DATASHEET_CACHE: kv,
    IMAGES: {},
    SUPABASE_URL: 'http://127.0.0.1:9',
    SUPABASE_ANON_KEY: 'test',
    ANTHROPIC_API_KEY: 'test',
    JWT_SECRET: 'test-secret-test-secret-test-secret',
    ADMIN_API_KEY: ADMIN_KEY,
    ENVIRONMENT: 'development',
  };
}

function post(path: string, body: string, headers: Record<string, string> = {}) {
  return app.request(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
    },
    createEnv()
  );
}

describe('App', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serves the health check', async () => {
    const res = await app.request('/', {}, createEnv());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', service: 'speccheck-api' });
  });

  describe('malformed request bodies', () => {
    it.each([
      ['/api/datasheet/search', {}],
      ['/api/datasheet/identify', {}],
      ['/api/analyze/claim', { 'X-API-Key': ADMIN_KEY }],
      ['/api/community/submit', { 'X-API-Key': ADMIN_KEY }],
    ])('returns 400 JSON for invalid JSON on %s', async (path, headers) => {
      const res = await post(path, '{not json', headers);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Request body must be valid JSON' });
    });

    it.each(['null', '[]', '"text"', '42'])('returns 400 JSON for a %s body', async (body) => {
      const res = await post('/api/datasheet/search', body);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Request body must be a JSON object' });
    });

    it('still runs route validation on well-formed bodies', async () => {
      const res = await post('/api/datasheet/search', JSON.stringify({ query: '' }));

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Query is required' });
    });
  });

  describe('unhandled errors', () => {
    it('returns a JSON 500 with the request ID', async () => {
      const kv = createKV({
        get: jest.fn(async () => {
          throw new Error('KV unavailable');
        }),
      });

      const res = await app.request('/api/datasheet/PT4115', {}, createEnv(kv));
      const body = (await res.json()) as { error: string; requestId: string };

      expect(res.status).toBe(500);
      expect(body.error).toBe('Internal server error');
      expect(body.requestId).toBe(res.headers.get('X-Request-Id'));
    });
  });

  // app.request() sends string bodies without Content-Length, so these go through
  // bodyLimit's streaming check unless a test sets the header itself.
  describe('body limits', () => {
    it('rejects bodies over 5MB on regular routes', async () => {
      const res = await post('/api/datasheet/search', JSON.stringify({ query: 'x'.repeat(6 * MB) }));

      expect(res.status).toBe(413);
    });

    it('rejects bodies over 5MB by Content-Length before reading them', async () => {
      const body = JSON.stringify({ query: 'x'.repeat(6 * MB) });
      const res = await post('/api/datasheet/search', body, {
        'Content-Length': String(body.length),
      });

      expect(res.status).toBe(413);
    });

    it('lets submissions through up to the 20MB submit limit', async () => {
      // Empty product name fails validation, which proves the body got past both limits
      const body = JSON.stringify({ productName: '', verdict: 'plausible', images: ['A'.repeat(6 * MB)] });
      const res = await post('/api/community/submit', body, { 'X-API-Key': ADMIN_KEY });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Product name is required' });
    });

    it('rejects submissions over 20MB', async () => {
      const body = JSON.stringify({ productName: 'x', verdict: 'plausible', images: ['A'.repeat(21 * MB)] });
      const res = await post('/api/community/submit', body, { 'X-API-Key': ADMIN_KEY });

      expect(res.status).toBe(413);
    });
  });
});
