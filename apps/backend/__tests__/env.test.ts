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
  });
});
