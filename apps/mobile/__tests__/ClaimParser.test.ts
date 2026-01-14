/**
 * ClaimParser Tests
 */

import {
  parseClaim,
  parseMultipleClaims,
  validateClaim,
  formatClaimValue,
} from '../src/analysis/ClaimParser';

describe('ClaimParser', () => {
  describe('parseClaim', () => {
    it('parses basic lumens claim', () => {
      const result = parseClaim('10000 lumens');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(10000);
      expect(result?.unit).toBe('lm');
      expect(result?.category).toBe('lumens');
    });

    it('parses abbreviated lm unit', () => {
      const result = parseClaim('5000 lm');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(5000);
      expect(result?.unit).toBe('lm');
    });

    it('parses k multiplier', () => {
      const result = parseClaim('10k lumens');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(10000);
    });

    it('parses attached unit without space', () => {
      const result = parseClaim('5000lm');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(5000);
      expect(result?.unit).toBe('lm');
    });

    it('parses Wh capacity', () => {
      const result = parseClaim('100 wh');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(100);
      expect(result?.unit).toBe('Wh');
      expect(result?.category).toBe('wh');
    });

    it('converts Ah to mAh', () => {
      const result = parseClaim('2ah');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(2000);
      expect(result?.unit).toBe('mAh');
    });

    it('parses watts', () => {
      const result = parseClaim('100W');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(100);
      expect(result?.unit).toBe('W');
      expect(result?.category).toBe('watts');
    });

    it('parses volts', () => {
      const result = parseClaim('12 volts');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(12);
      expect(result?.unit).toBe('V');
    });

    it('parses amps', () => {
      const result = parseClaim('5A');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(5);
      expect(result?.unit).toBe('A');
    });

    it('handles commas in numbers', () => {
      const result = parseClaim('10,000 lumens');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(10000);
    });

    it('handles decimal values', () => {
      const result = parseClaim('2.5W');
      expect(result).not.toBeNull();
      expect(result?.value).toBe(2.5);
    });

    it('returns null for empty input', () => {
      expect(parseClaim('')).toBeNull();
      expect(parseClaim('   ')).toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(parseClaim('hello world')).toBeNull();
      expect(parseClaim('1234')).toBeNull();
      expect(parseClaim('xyz units')).toBeNull();
    });

    it('preserves original text', () => {
      const result = parseClaim('10,000 lumens');
      expect(result?.originalText).toBe('10,000 lumens');
    });

    it('sets source correctly', () => {
      const result = parseClaim('1000lm', 'listing_text');
      expect(result?.source).toBe('listing_text');
    });
  });

  describe('parseMultipleClaims', () => {
    it('parses comma-separated claims', () => {
      const results = parseMultipleClaims('10000 lumens, 100 wh');
      expect(results).toHaveLength(2);
      expect(results[0].category).toBe('lumens');
      expect(results[1].category).toBe('wh');
    });

    it('parses semicolon-separated claims', () => {
      const results = parseMultipleClaims('100W; 5A');
      expect(results).toHaveLength(2);
    });

    it('parses "and" separated claims', () => {
      const results = parseMultipleClaims('10000 lumens and 100W');
      expect(results).toHaveLength(2);
    });

    it('handles mixed valid and invalid parts', () => {
      const results = parseMultipleClaims('10000 lumens, invalid, 100W');
      expect(results).toHaveLength(2);
    });

    it('returns empty array for no valid claims', () => {
      const results = parseMultipleClaims('hello, world');
      expect(results).toHaveLength(0);
    });
  });

  describe('validateClaim', () => {
    it('validates reasonable lumens value', () => {
      const claim = parseClaim('10000 lumens')!;
      const result = validateClaim(claim);
      expect(result.valid).toBe(true);
    });

    it('warns about unreasonable lumens value', () => {
      const claim = parseClaim('500000 lumens')!;
      const result = validateClaim(claim);
      expect(result.valid).toBe(false);
      expect(result.warning).toBeDefined();
    });

    it('validates reasonable Wh value', () => {
      const claim = parseClaim('100 Wh')!;
      const result = validateClaim(claim);
      expect(result.valid).toBe(true);
    });
  });

  describe('formatClaimValue', () => {
    it('formats millions with M suffix', () => {
      expect(formatClaimValue(2000000, 'lm')).toBe('2.0M lm');
    });

    it('formats thousands with k suffix', () => {
      expect(formatClaimValue(10000, 'lm')).toBe('10.0k lm');
    });

    it('formats small values with decimal', () => {
      expect(formatClaimValue(0.5, 'A')).toBe('0.50 A');
    });

    it('formats regular values with locale string', () => {
      expect(formatClaimValue(500, 'W')).toBe('500 W');
    });
  });
});
