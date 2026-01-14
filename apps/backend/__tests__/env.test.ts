/**
 * Environment Config Tests
 */

import { CACHE_TTL } from '../src/env';

describe('Environment Config', () => {
  describe('CACHE_TTL', () => {
    it('has correct datasheet TTL (24 hours)', () => {
      expect(CACHE_TTL.DATASHEET).toBe(60 * 60 * 24);
      expect(CACHE_TTL.DATASHEET).toBe(86400);
    });

    it('has correct search results TTL (5 minutes)', () => {
      expect(CACHE_TTL.SEARCH_RESULTS).toBe(60 * 5);
      expect(CACHE_TTL.SEARCH_RESULTS).toBe(300);
    });
  });
});
