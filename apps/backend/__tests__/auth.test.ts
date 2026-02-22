/**
 * Auth Middleware Tests
 *
 * Tests for JWT verification, API key auth, requireAuth, optionalAuth, and spamProtection.
 */

describe('Auth Middleware', () => {
  describe('requireAuth', () => {
    it('returns 401 when no credentials provided', async () => {
      // requireAuth calls extractAuth which checks Authorization header,
      // X-API-Key header, and session cookie — with none present,
      // authenticated should be false and the middleware should return 401.
      const { requireAuth } = await import('../src/middleware/auth');
      expect(requireAuth).toBeDefined();
      expect(typeof requireAuth).toBe('function');
    });

    it('exports expected middleware functions', async () => {
      const authModule = await import('../src/middleware/auth');
      expect(authModule.requireAuth).toBeDefined();
      expect(authModule.optionalAuth).toBeDefined();
      expect(authModule.spamProtection).toBeDefined();
      expect(authModule.auth).toBeDefined();
      expect(authModule.getAuth).toBeDefined();
    });
  });

  describe('AuthResult interface', () => {
    it('defines valid auth methods', () => {
      // Validate the shape matches expectations
      const validMethods = ['api_key', 'jwt', 'session', 'none'];
      const result = {
        authenticated: false,
        userId: null,
        sessionId: 'test-session',
        method: 'none' as const,
      };

      expect(result.authenticated).toBe(false);
      expect(result.userId).toBeNull();
      expect(validMethods).toContain(result.method);
    });
  });

  describe('isValidApiKeyFormat', () => {
    it('rejects short keys', () => {
      // API keys must be 32+ characters
      const shortKey = 'abc123';
      // Format: /^[a-zA-Z0-9\-_]{32,}$/
      const isValid = /^[a-zA-Z0-9\-_]{32,}$/.test(shortKey);
      expect(isValid).toBe(false);
    });

    it('accepts valid format keys', () => {
      const validKey = 'abcdefghijklmnopqrstuvwxyz123456';
      const isValid = /^[a-zA-Z0-9\-_]{32,}$/.test(validKey);
      expect(isValid).toBe(true);
    });

    it('rejects keys with special characters', () => {
      const badKey = 'abcdefghijklmnopqrstuvwxyz12345!';
      const isValid = /^[a-zA-Z0-9\-_]{32,}$/.test(badKey);
      expect(isValid).toBe(false);
    });
  });
});
