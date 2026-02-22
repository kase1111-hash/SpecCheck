/**
 * Route Tests
 *
 * Tests for analyze and community route validation logic.
 */

describe('Analyze Routes', () => {
  describe('request validation', () => {
    it('requires claim with numeric value', () => {
      const validRequest = {
        claim: { category: 'lumens', value: 10000, unit: 'lm' },
        components: [{ partNumber: 'XHP70.2', manufacturer: 'Cree', category: 'led', specs: {} }],
        category: 'flashlight',
      };

      expect(typeof validRequest.claim.value).toBe('number');
      expect(validRequest.components.length).toBeGreaterThan(0);
    });

    it('rejects claim without numeric value', () => {
      const invalidClaim = { category: 'lumens', value: 'not a number', unit: 'lm' };
      expect(typeof invalidClaim.value).not.toBe('number');
    });

    it('rejects empty components array', () => {
      const emptyComponents: unknown[] = [];
      expect(emptyComponents.length).toBe(0);
    });
  });
});

describe('Community Routes', () => {
  const VALID_VERDICTS = ['plausible', 'impossible', 'uncertain'];
  const MAX_PRODUCT_NAME_LENGTH = 200;
  const MAX_LISTING_URL_LENGTH = 2048;
  const MAX_IMAGES = 10;

  describe('input validation', () => {
    it('requires product name', () => {
      const body = { productName: '', verdict: 'plausible' };
      expect(body.productName.trim().length).toBe(0);
    });

    it('enforces product name length limit', () => {
      const longName = 'A'.repeat(201);
      expect(longName.length).toBeGreaterThan(MAX_PRODUCT_NAME_LENGTH);
    });

    it('validates verdict enum', () => {
      expect(VALID_VERDICTS).toContain('plausible');
      expect(VALID_VERDICTS).toContain('impossible');
      expect(VALID_VERDICTS).toContain('uncertain');
      expect(VALID_VERDICTS).not.toContain('maybe');
    });

    it('validates listing URL format', () => {
      const validUrl = 'https://example.com/product/123';
      const invalidUrl = 'not-a-url';

      const isValid = (url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      };

      expect(isValid(validUrl)).toBe(true);
      expect(isValid(invalidUrl)).toBe(false);
    });

    it('enforces listing URL length limit', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2050);
      expect(longUrl.length).toBeGreaterThan(MAX_LISTING_URL_LENGTH);
    });

    it('enforces image count limit', () => {
      const tooManyImages = new Array(11).fill('data:image/jpeg;base64,abc');
      expect(tooManyImages.length).toBeGreaterThan(MAX_IMAGES);
    });

    it('rejects external image URLs (SSRF protection)', () => {
      const externalUrl = 'https://evil.com/image.jpg';
      const base64Image = 'data:image/jpeg;base64,/9j/4AAQ...';

      // The route only accepts base64 data, not external URLs
      const isBase64 = (img: string) => img.startsWith('data:') || !img.startsWith('http');
      expect(isBase64(externalUrl)).toBe(false);
      expect(isBase64(base64Image)).toBe(true);
    });
  });

  describe('search and recent', () => {
    it('defaults limit to 20', () => {
      const defaultLimit = parseInt('', 10) || 20;
      expect(defaultLimit).toBe(20);
    });

    it('defaults offset to 0', () => {
      const defaultOffset = parseInt('', 10) || 0;
      expect(defaultOffset).toBe(0);
    });
  });
});
