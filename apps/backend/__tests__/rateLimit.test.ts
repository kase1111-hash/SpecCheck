/**
 * Rate Limit Tests
 *
 * Tests for rate limit configuration and middleware logic.
 */

import { RATE_LIMITS } from '../src/middleware/rateLimit';

describe('Rate Limit Configuration', () => {
  it('has correct default limits', () => {
    expect(RATE_LIMITS.default.maxRequests).toBe(100);
    expect(RATE_LIMITS.default.windowSeconds).toBe(60);
  });

  it('has higher limits for datasheet (read-heavy)', () => {
    expect(RATE_LIMITS.datasheet.maxRequests).toBe(200);
    expect(RATE_LIMITS.datasheet.maxRequests).toBeGreaterThan(RATE_LIMITS.default.maxRequests);
  });

  it('has lower limits for analyze (expensive LLM)', () => {
    expect(RATE_LIMITS.analyze.maxRequests).toBe(20);
    expect(RATE_LIMITS.analyze.maxRequests).toBeLessThan(RATE_LIMITS.default.maxRequests);
  });

  it('has strict limits for submit (write operations)', () => {
    expect(RATE_LIMITS.submit.maxRequests).toBe(10);
    expect(RATE_LIMITS.submit.maxRequests).toBeLessThan(RATE_LIMITS.analyze.maxRequests);
  });

  it('has moderate limits for search', () => {
    expect(RATE_LIMITS.search.maxRequests).toBe(60);
    expect(RATE_LIMITS.search.windowSeconds).toBe(60);
  });

  it('all configs use 60-second windows', () => {
    for (const config of Object.values(RATE_LIMITS)) {
      expect(config.windowSeconds).toBe(60);
    }
  });
});
