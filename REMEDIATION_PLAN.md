# SpecCheck — Remediation Plan

**Based on:** VIBE_CHECK_REPORT.md (Audit Date: 2026-02-22)
**Current Score:** 57.6% Weighted Authenticity / 42.4% Vibe-Code Confidence
**Target Score:** >80% Weighted Authenticity (Mostly Authentic)

---

## Overview

This plan is organized into 4 phases, ordered by blast radius and dependency:

| Phase | Focus | Duration Est. | Audit Score Impact |
|-------|-------|---------------|--------------------|
| **Phase 1** | Security (block production) | 1 sprint | B6: 1→3, C4: 1→3 |
| **Phase 2** | Core pipeline (make it work) | 2 sprints | B3: 1→3, A3: 2→3 |
| **Phase 3** | Operational hardening | 1 sprint | B5: 2→3, B7: 2→3, C7: 1→2 |
| **Phase 4** | Documentation & test honesty | 1 sprint | A6: 1→2, A3: 2→3, C6: 2→3 |

Each task includes the **file(s) to change**, **what to do**, **how to verify**, and **definition of done**.

---

## Phase 1: Security — Block Production

These issues must be fixed before any deployment. An attacker can currently forge authentication and access all protected endpoints.

---

### 1.1 Implement Real JWT Verification

**Audit Finding:** #1 (HIGH) — `auth.ts:78-103`
**Problem:** `verifyJwt()` decodes the JWT payload but never verifies the signature. Any client can forge tokens with arbitrary `sub`/`userId` claims.

**Files to change:**
- `apps/backend/src/middleware/auth.ts`
- `apps/backend/package.json` (add `hono/jwt` or `jose`)
- `apps/backend/wrangler.toml` (add `JWT_SECRET` secret)

**Implementation:**

```typescript
// auth.ts — Replace verifyJwt with:
import { verify } from 'hono/jwt';

async function verifyJwt(
  c: Context<AppEnv>,
  token: string
): Promise<{ valid: boolean; userId: string | null }> {
  try {
    const secret = c.env.JWT_SECRET;
    if (!secret) {
      console.error('[Auth] JWT_SECRET not configured');
      return { valid: false, userId: null };
    }

    const payload = await verify(token, secret);

    // Check expiration (hono/jwt does this, but be explicit)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, userId: null };
    }

    return { valid: true, userId: (payload.sub as string) || null };
  } catch {
    return { valid: false, userId: null };
  }
}
```

**Also add to `Env` interface in `env.ts`:**
```typescript
JWT_SECRET: string;
```

**Verification:**
- Write test: forge a JWT with wrong secret → expect 401
- Write test: valid JWT with correct secret → expect 200
- Write test: expired JWT → expect 401

**Definition of Done:**
- [ ] `hono/jwt` `verify()` used with `JWT_SECRET` env var
- [ ] `JWT_SECRET` added to `Env` interface and `wrangler.toml` secrets
- [ ] All 3 test cases pass
- [ ] Manual test: curling a protected endpoint with a hand-crafted JWT returns 401

---

### 1.2 Enforce Authentication on Protected Routes

**Audit Finding:** #2 (HIGH) — `auth.ts:155-167`, `index.ts:75,81`
**Problem:** The `auth` middleware always calls `next()` regardless of auth status. Protected routes are unprotected.

**Files to change:**
- `apps/backend/src/index.ts` (lines 75, 81)

**Implementation:**

In `index.ts`, replace `auth` with `requireAuth` on protected routes:

```typescript
// Before (broken):
app.use('/api/analyze/*', auth);
app.use('/api/community/submit', auth);

// After (enforced):
import { requireAuth } from './middleware/auth';

app.use('/api/analyze/*', requireAuth);
app.use('/api/community/submit', requireAuth);
```

Keep `auth` (non-enforcing) for routes that want optional user context:
```typescript
app.use('/api/community/search', optionalAuth);
app.use('/api/community/recent', optionalAuth);
```

**Verification:**
- `curl -X POST /api/analyze/claim` with no auth header → 401
- `curl -X POST /api/community/submit` with no auth header → 401
- `curl -X GET /api/community/search` with no auth header → 200 (optional auth)
- `curl -X POST /api/analyze/claim -H "Authorization: Bearer <valid>"` → 200

**Definition of Done:**
- [ ] `requireAuth` imported and used on `/api/analyze/*` and `/api/community/submit`
- [ ] `optionalAuth` used on community read routes
- [ ] Integration tests verify 401 without token, 200 with valid token

---

### 1.3 Wire Spam Protection Middleware

**Audit Finding:** #7 (MEDIUM) — `auth.ts:211-267`
**Problem:** `spamProtection` middleware was written but never mounted on any route.

**Files to change:**
- `apps/backend/src/index.ts`

**Implementation:**

```typescript
import { requireAuth, spamProtection } from './middleware/auth';

// Chain spamProtection BEFORE requireAuth on submit route
app.use('/api/community/submit', spamProtection);
app.use('/api/community/submit', requireAuth);
app.use('/api/community/submit', rateLimitSubmit);
```

**Definition of Done:**
- [ ] `spamProtection` imported and mounted on `/api/community/submit`
- [ ] Rapid anonymous submissions (< 30s apart) return 429

---

### 1.4 Environment-Based CORS

**Audit Finding:** #8 (MEDIUM) — `index.ts:46`
**Problem:** CORS allows `http://localhost:8081` in all environments including production.

**Files to change:**
- `apps/backend/src/index.ts`

**Implementation:**

```typescript
// Replace static CORS config with environment-aware config
app.use('/*', async (c, next) => {
  const env = c.env.ENVIRONMENT || 'production';
  const origins = ['https://speccheck.app'];

  if (env === 'development') {
    origins.push('http://localhost:8081');
  }

  return cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })(c, next);
});
```

**Also wire the `ENVIRONMENT` env var** — this fixes Finding #11 simultaneously.

**Verification:**
- In production, `Origin: http://localhost:8081` request → no `Access-Control-Allow-Origin` header
- In development, same request → header present

**Definition of Done:**
- [ ] CORS origins conditional on `ENVIRONMENT`
- [ ] `ENVIRONMENT` env var set in `wrangler.toml` for each deploy target
- [ ] `ENVIRONMENT` ghost config eliminated from Finding #11

---

### 1.5 Input Sanitization on Community Submissions

**Audit Finding:** #9 (MEDIUM) — `community.ts:29-35`
**Problem:** `productName`, `verdict`, `listingUrl` passed directly to database without length limits or sanitization.

**Files to change:**
- `apps/backend/src/routes/community.ts`

**Implementation:**

Add validation at the top of the `/submit` handler, after parsing body:

```typescript
communityRoutes.post('/submit', async (c) => {
  const body = await c.req.json<SubmitRequest>();

  // Input validation
  if (!body.productName || body.productName.trim().length === 0) {
    return c.json({ error: 'Product name is required' }, 400);
  }
  if (body.productName.length > 200) {
    return c.json({ error: 'Product name too long (max 200 characters)' }, 400);
  }
  if (!body.verdict || body.verdict.trim().length === 0) {
    return c.json({ error: 'Verdict is required' }, 400);
  }
  if (!['plausible', 'impossible', 'uncertain'].includes(body.verdict)) {
    return c.json({ error: 'Verdict must be plausible, impossible, or uncertain' }, 400);
  }
  if (body.listingUrl && body.listingUrl.length > 2048) {
    return c.json({ error: 'Listing URL too long (max 2048 characters)' }, 400);
  }
  if (body.listingUrl && !isValidUrl(body.listingUrl)) {
    return c.json({ error: 'Invalid listing URL' }, 400);
  }
  if (body.images && body.images.length > 10) {
    return c.json({ error: 'Too many images (max 10)' }, 400);
  }

  // Sanitize string fields
  body.productName = body.productName.trim().slice(0, 200);
  body.verdict = body.verdict.trim();
  // ... rest of handler
});

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

**Also fix Finding #10 (SSRF):** Remove the pass-through for arbitrary image URLs:

```typescript
// Before (SSRF risk):
if (imageData.startsWith('data:') || !imageData.startsWith('http')) {
  // upload base64
} else {
  imageUrls.push(imageData);  // ← SSRF: accepts any URL
}

// After (safe):
if (imageData.startsWith('data:') || !imageData.startsWith('http')) {
  // upload base64 — only accept base64 data
  const url = await storage.uploadBase64Image(/* ... */);
  imageUrls.push(url);
} else {
  // Reject external URLs — require base64 upload only
  console.warn('[Community] Rejected external image URL');
}
```

**Definition of Done:**
- [ ] `productName` max 200 chars, `verdict` enum-validated, `listingUrl` URL-validated
- [ ] Image URLs must be base64 data — external URLs rejected
- [ ] Tests for each validation rule (400 responses)
- [ ] Tests for SSRF rejection

---

### 1.6 Add Request Body Size Limits

**Audit Finding:** Implicit from C4
**Problem:** No request body size limits allow oversized payloads (memory exhaustion).

**Files to change:**
- `apps/backend/src/index.ts`

**Implementation:**

```typescript
import { bodyLimit } from 'hono/body-limit';

// Apply globally — 5MB default, override per route
app.use('/*', bodyLimit({ maxSize: 5 * 1024 * 1024 }));

// Community submit allows larger for images (20MB)
app.use('/api/community/submit', bodyLimit({ maxSize: 20 * 1024 * 1024 }));
```

**Definition of Done:**
- [ ] Body limit middleware applied globally (5MB) and per-route (20MB for submit)
- [ ] Request exceeding limit → 413 Payload Too Large

---

## Phase 2: Core Pipeline — Make It Work

The app's core value proposition (scan → detect → analyze → verdict) currently returns mock data. This phase makes the pipeline functional.

---

### 2.1 Ship a Real ML Model (or Honest Fallback)

**Audit Finding:** #3 (HIGH) — `ComponentDetector.ts:100-108`, `TFLiteModel.ts:148-157`
**Problem:** No trained model ships. `loadModel()` silently falls back to mock detections that return 3 hardcoded fake components. `TFLiteModel` creates a random-weight placeholder. Users receive fabricated results.

**Files to change:**
- `apps/mobile/src/recognition/ComponentDetector.ts`
- `apps/mobile/src/recognition/TFLiteModel.ts`
- `apps/mobile/assets/models/` (add real model or remove directory)

**Strategy — Choose one:**

**Option A: Ship a real TFLite model (recommended if you have training data)**
1. Train a SSD-MobileNet v3 model on labeled PCB images using TensorFlow Object Detection API
2. Convert to TFLite with `tflite_convert`
3. Place quantized `.tflite` file in `assets/models/component_detector.tflite`
4. Update `TFLiteModel.ts` to load from this path, remove `createPlaceholderModel()`

**Option B: Remove mock fallback, fail honestly**

If no model is available yet, the app should tell the user — not lie with fake data:

```typescript
// ComponentDetector.ts — loadModel()
async loadModel(): Promise<void> {
  try {
    console.log('[ComponentDetector] Initializing TFLite model...');
    await this.model.loadModel();
    this.isModelLoaded = true;
    this.useMockDetections = false;
    console.log('[ComponentDetector] Model loaded successfully');
  } catch (error) {
    console.error('[ComponentDetector] Failed to load model:', error);
    // DO NOT silently fall back to mock data in production
    this.isModelLoaded = false;
    this.useMockDetections = false;
    throw new Error(
      'Component detection model failed to load. ' +
      'Please update the app or try again later.'
    );
  }
}
```

```typescript
// TFLiteModel.ts — Remove createPlaceholderModel() entirely
// In loadModel(), if no model file exists, throw:
async loadModel(): Promise<void> {
  // ... existing model loading code ...
  if (!modelLoaded) {
    throw new Error('No detection model available. Model file not found.');
  }
}
```

**Also update `detect()` in ComponentDetector to surface the error:**
```typescript
async detect(frame: CameraFrame): Promise<DetectionResult> {
  if (!this.isModelLoaded) {
    throw new Error('Model not loaded. Call loadModel() first.');
  }
  // Remove the useMockDetections branch entirely in production builds
  // Or gate it behind __DEV__:
  if (__DEV__ && this.useMockDetections) {
    return { frameId: frame.id, regions: await this.generateMockDetections(frame), processingTimeMs: 0, modelVersion: 'mock' };
  }
  return { frameId: frame.id, regions: await this.runInference(frame), processingTimeMs: Date.now() - startTime, modelVersion: MODEL_VERSION };
}
```

**Verification:**
- In production build: if no model file → app shows "model not available" error
- In dev build: mock data can optionally be used (gated by `__DEV__`)
- If real model exists: inference runs and returns actual detections

**Definition of Done:**
- [ ] `createPlaceholderModel()` removed from `TFLiteModel.ts`
- [ ] Mock detection fallback gated behind `__DEV__` flag only
- [ ] Production builds fail clearly when no model available
- [ ] Either a real `.tflite` model ships, or the UI shows "model not available" state

---

### 2.2 Implement Real OCR Integration

**Audit Finding:** #4 (HIGH) — `OCREngine.ts:166-189`
**Problem:** OCR pipeline returns empty arrays. ML Kit is dynamically imported (may not be installed). Fallback returns `[]` in dev, tries unavailable `tesseract.js` in production.

**Files to change:**
- `apps/mobile/src/recognition/OCREngine.ts`
- `apps/mobile/package.json` (make `@react-native-ml-kit/text-recognition` a required dependency)

**Implementation:**

**Step 1:** Make ML Kit a required dependency:
```bash
cd apps/mobile
npx expo install @react-native-ml-kit/text-recognition
```

**Step 2:** Replace dynamic import with static import in `OCREngine.ts`:
```typescript
// Replace dynamic import at line 137 with:
import TextRecognition from '@react-native-ml-kit/text-recognition';

// In runOCR():
private async runOCR(imageBase64: string, bbox: BoundingBox): Promise<string[]> {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const croppedResult = await ImageManipulator.manipulateAsync(
      imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
      [{ crop: { originX: bbox.x, originY: bbox.y, width: bbox.width, height: bbox.height } }],
      { base64: true, format: ImageManipulator.SaveFormat.JPEG }
    );

    const result = await TextRecognition.recognize(croppedResult.uri);
    const lines: string[] = [];
    for (const block of result.blocks) {
      for (const line of block.lines) {
        if (line.text && line.text.trim().length > 0) {
          lines.push(line.text);
        }
      }
    }
    return lines;
  } catch (error) {
    console.error('[OCREngine] OCR failed:', error);
    // Return empty — let the pipeline handle "no text found"
    // Do NOT silently succeed with mock data
    return [];
  }
}
```

**Step 3:** Remove `runFallbackOCR()` method entirely, or gate behind `__DEV__`:
```typescript
// Remove the tesseract.js fallback — it's not a real dependency
// If ML Kit fails, return [] and let the pipeline report "no text extracted"
```

**Verification:**
- On a real device: point camera at text → OCR returns actual text lines
- If ML Kit fails: error logged, empty array returned, pipeline shows "no text found" state
- No phantom `tesseract.js` imports

**Definition of Done:**
- [ ] `@react-native-ml-kit/text-recognition` is a listed dependency in `package.json`
- [ ] Static import replaces dynamic import
- [ ] `runFallbackOCR` removed (or `__DEV__`-only)
- [ ] Tested on physical device with real chip markings

---

### 2.3 LLM Service: Distinguish Errors from Uncertain Verdicts

**Audit Finding:** B1 — `LLMService.ts:139-146`
**Problem:** When the Claude API fails (network error, 500, timeout), the service returns `{ verdict: 'uncertain', reasoning: 'Analysis failed: ...' }`. The caller cannot distinguish "not enough data" from "API was down."

**Files to change:**
- `apps/backend/src/services/LLMService.ts`
- `apps/backend/src/routes/analyze.ts`

**Implementation:**

The service should throw on failure, letting the route handler decide the response:

```typescript
// LLMService.ts — Replace lines 137-147:
// Remove the silent fallback. Let the error propagate.
async analyzeClaim(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  // ... existing retry loop ...

  // After all retries exhausted:
  throw new Error(
    `LLM analysis failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message || 'Unknown error'}`
  );
}
```

```typescript
// analyze.ts — Catch the error and return a proper 503:
analyzeRoutes.post('/claim', async (c) => {
  // ... existing validation ...
  try {
    const result = await llmService.analyzeClaim(request);
    return c.json(result);
  } catch (error) {
    console.error('Analyze claim failed:', error);
    return c.json({
      error: 'Analysis service unavailable',
      message: 'The analysis service is temporarily unavailable. Please try again later.',
      retryable: true,
    }, 503);
  }
});
```

**Definition of Done:**
- [ ] LLM service throws on failure instead of returning fake uncertain verdict
- [ ] Route handler catches and returns 503 with `retryable: true`
- [ ] Client can distinguish "uncertain" (real analysis result) from "service down" (503)

---

### 2.4 Add API Request Timeout

**Audit Finding:** #14 (LOW) — `LLMService.ts:68-85`
**Problem:** No timeout on the Claude API call. A hanging response holds the Worker indefinitely.

**Files to change:**
- `apps/backend/src/services/LLMService.ts`

**Implementation:**

```typescript
// Add timeout constant
const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

// In the fetch call, add AbortController:
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { /* ... */ },
      body: JSON.stringify({ /* ... */ }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // ... rest of handling
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      lastError = new Error('Claude API request timed out');
      if (attempt < MAX_RETRIES) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        await this.sleep(delayMs);
        continue;
      }
    }
    // ... rest of error handling
  }
}
```

**Definition of Done:**
- [ ] `AbortController` with 30s timeout wraps every fetch call
- [ ] Timeout triggers retry with backoff
- [ ] After all retries, throws with "timed out" message

---

### 2.5 Backend Error Responses: Stop Swallowing Errors

**Audit Finding:** B1 — `community.ts:106-109`
**Problem:** Community search/recent routes return `{ results: [], totalCount: 0 }` on database errors. The client thinks the search succeeded with no results.

**Files to change:**
- `apps/backend/src/routes/community.ts`

**Implementation:**

Return proper error responses instead of empty success:

```typescript
// community.ts — search route
} catch (error) {
  console.error('Search failed:', error);
  return c.json({
    error: 'Search failed',
    message: 'Unable to search submissions. Please try again.',
  }, 500);
}

// community.ts — recent route
} catch (error) {
  console.error('Failed to fetch recent submissions:', error);
  return c.json({
    error: 'Fetch failed',
    message: 'Unable to load recent submissions. Please try again.',
  }, 500);
}
```

**Definition of Done:**
- [ ] All catch blocks in `community.ts` return 500 with error JSON, not empty success
- [ ] Client can distinguish "no results" (200, empty array) from "server error" (500)

---

## Phase 3: Operational Hardening

These issues don't block launch but will cause production incidents under load.

---

### 3.1 Fix Rate Limiter for Cloudflare Workers

**Audit Finding:** #5, #6 (MEDIUM) — `rateLimit.ts:75, 108-128`
**Problems:**
1. `setInterval` at module scope leaks timers (Workers are request-scoped)
2. KV read-then-write is non-atomic (race condition under concurrency)

**Files to change:**
- `apps/backend/src/middleware/rateLimit.ts`

**Implementation:**

**Fix 1:** Remove `setInterval` entirely. KV entries already have TTL (`expirationTtl`), so cleanup is automatic:
```typescript
// DELETE these lines (60-75):
const memoryStore = new Map<...>();
function cleanupMemoryStore(): void { ... }
setInterval(cleanupMemoryStore, 60000);
```

**Fix 2:** Remove the memory store fallback. In Workers, just use KV:
```typescript
async function checkRateLimit(
  c: Context<AppEnv>,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const kv = c.env?.DATASHEET_CACHE;

  if (!kv) {
    // No KV available — allow request but log warning
    console.warn('[RateLimit] KV namespace not available, skipping rate limit');
    return { allowed: true, remaining: config.maxRequests, resetAt: now + windowMs };
  }

  try {
    const stored = await kv.get(key, 'json') as { count: number; windowStart: number } | null;

    let count: number;
    let windowStart: number;

    if (!stored || now - stored.windowStart >= windowMs) {
      count = 1;
      windowStart = now;
    } else {
      count = stored.count + 1;
      windowStart = stored.windowStart;
    }

    // Store with TTL for automatic cleanup
    await kv.put(key, JSON.stringify({ count, windowStart }), {
      expirationTtl: config.windowSeconds + 60,
    });

    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt: windowStart + windowMs,
    };
  } catch (error) {
    console.error('[RateLimit] KV error:', error);
    // On KV failure, allow request (fail open) but log
    return { allowed: true, remaining: config.maxRequests, resetAt: now + windowMs };
  }
}
```

> **Note on atomicity:** KV's read-then-write is inherently non-atomic. For strict rate limiting, migrate to Cloudflare Durable Objects. For now, the KV approach is acceptable with the understanding that under extreme concurrency, some requests may slip through. Document this trade-off.

**Definition of Done:**
- [ ] `setInterval` removed from module scope
- [ ] `memoryStore` Map removed
- [ ] KV TTL handles cleanup automatically
- [ ] Rate limiter works correctly in Workers environment (no timer leaks)
- [ ] Comment documents KV atomicity limitation

---

### 3.2 Add Structured Logging

**Audit Finding:** C7 — Score 1
**Problem:** All logging is `console.log`/`console.error` with no structure, no request correlation, no metrics.

**Files to change:**
- `apps/backend/src/middleware/logger.ts` (new file)
- `apps/backend/src/index.ts`

**Implementation:**

Create a simple structured logger middleware:

```typescript
// middleware/logger.ts
import type { Context, Next } from 'hono';
import type { AppEnv } from '../index';

export async function requestLogger(c: Context<AppEnv>, next: Next) {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  // Set request ID for downstream use
  c.set('requestId' as never, requestId);
  c.header('X-Request-Id', requestId);

  await next();

  const duration = Date.now() - start;
  const log = {
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    ip: c.req.header('CF-Connecting-IP') || 'unknown',
    userAgent: c.req.header('User-Agent')?.slice(0, 100),
  };

  if (c.res.status >= 500) {
    console.error(JSON.stringify(log));
  } else if (c.res.status >= 400) {
    console.warn(JSON.stringify(log));
  } else {
    console.log(JSON.stringify(log));
  }
}
```

Mount it in `index.ts`:
```typescript
import { requestLogger } from './middleware/logger';
app.use('/*', requestLogger);
```

**Definition of Done:**
- [ ] Every request logs structured JSON with requestId, method, path, status, duration
- [ ] `X-Request-Id` header returned on all responses
- [ ] Error logs include request context
- [ ] Existing `console.error` calls in route handlers include requestId where available

---

### 3.3 Bounded Concurrency for R2 Uploads

**Audit Finding:** B7
**Problem:** `StorageService.uploadImages` fires unbounded `Promise.all` for all images simultaneously.

**Files to change:**
- `apps/backend/src/services/StorageService.ts`

**Implementation:**

Add a simple concurrency limiter:

```typescript
// Utility: run promises with bounded concurrency
async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).then((r) => { results.push(r); });
    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        // Check if settled by trying to race with an instant resolve
        const settled = await Promise.race([
          executing[i].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) executing.splice(i, 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}

// Usage in uploadImages:
async uploadImages(images: string[]): Promise<string[]> {
  return mapWithConcurrency(
    images,
    (img) => this.uploadBase64Image(img, `img-${Date.now()}.jpg`, 'image/jpeg'),
    3  // Max 3 concurrent uploads
  );
}
```

**Definition of Done:**
- [ ] R2 uploads limited to 3 concurrent operations
- [ ] 10 images upload successfully without overwhelming R2

---

### 3.4 Singleton Cleanup Lifecycle

**Audit Finding:** B5
**Problem:** Module-level singletons (`getComponentDetector()`, `getOCREngine()`, `getPipeline()`) hold state indefinitely with no cleanup.

**Files to change:**
- `apps/mobile/src/recognition/ComponentDetector.ts`
- `apps/mobile/src/recognition/OCREngine.ts`
- `apps/mobile/src/pipeline/Pipeline.ts`
- `apps/mobile/src/datasheet/SpecRetriever.ts`

**Implementation:**

Add a centralized cleanup function called on app background/unmount:

```typescript
// apps/mobile/src/lifecycle.ts (new file)
import { resetComponentDetector } from './recognition/ComponentDetector';
import { getPipeline } from './pipeline/Pipeline';

export function cleanupResources(): void {
  resetComponentDetector();
  getPipeline().reset();
  // Add other cleanup as needed
}
```

Wire it to React Native AppState:
```typescript
// In root _layout.tsx:
import { AppState } from 'react-native';
import { cleanupResources } from '../src/lifecycle';

useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      cleanupResources();
    }
  });
  return () => sub.remove();
}, []);
```

**Definition of Done:**
- [ ] `cleanupResources()` disposes ML model, resets pipeline, clears caches
- [ ] Called when app enters background
- [ ] No memory leaks across app foreground/background cycles

---

## Phase 4: Documentation & Test Honesty

These changes improve code credibility and test coverage without requiring functional changes.

---

### 4.1 Right-Size Documentation to Reality

**Audit Finding:** A6 — Score 1
**Problem:** 4,656 lines of docs describe features that don't exist (AR overlay, real-time processing, offline sync, community search).

**Files to change:**
- `README.md`
- `Architecture.md`
- `docs/*.md` (all 9 files)

**Implementation:**

1. **README.md:** Replace aspirational feature descriptions with honest status:
   ```markdown
   ## Current Status (v0.1.0)
   - [x] Camera capture with Expo Camera
   - [x] Claim parsing (lumens, mAh, Wh, W, A, V)
   - [x] Constraint chain analysis engine
   - [x] Backend API with Supabase + Cloudflare Workers
   - [ ] On-device ML component detection (model training in progress)
   - [ ] OCR text extraction (ML Kit integration in progress)
   - [ ] AR overlay for component highlighting
   - [ ] Community submission frontend
   ```

2. **Architecture.md:** Add a "Status" column to every component:
   ```markdown
   | Component | Status | Notes |
   |-----------|--------|-------|
   | Camera Capture | Implemented | expo-camera integration |
   | Component Detection | Scaffolded | Awaiting trained model |
   | OCR Engine | Scaffolded | ML Kit integration WIP |
   | Constraint Chain | Implemented | Full analysis engine |
   | AR Overlay | Stub only | Not implemented |
   ```

3. **Consolidate `/docs/`:** Merge the 9 documentation files into 2-3:
   - `docs/Architecture.md` (merge ArchitectureDecisions + DataFlow + DataStructures)
   - `docs/Development.md` (merge ErrorHandling + Performance + CodingGuide)
   - `docs/Privacy.md` (keep as-is, it's relevant)
   - Delete `docs/ReleasePlan.md` (aspirational, move to GitHub milestones)
   - Delete `docs/ProblemDefinition.md` (covered by README)

**Definition of Done:**
- [ ] README accurately reflects what works vs. what's planned
- [ ] No documentation describes a feature as working when it's a stub
- [ ] `/docs/` consolidated from 9 to 3 files
- [ ] Total doc lines reduced by ~40%

---

### 4.2 Add Missing Test Categories

**Audit Finding:** A3 — Score 2
**Problem:** Only happy-path analysis engine tests exist. No error-path, integration, API route, or pipeline tests.

**Files to create/change:**
- `apps/backend/__tests__/routes/analyze.test.ts` (new)
- `apps/backend/__tests__/routes/community.test.ts` (new)
- `apps/backend/__tests__/middleware/auth.test.ts` (new)
- `apps/mobile/__tests__/Pipeline.test.ts` (new)

**Tests to write:**

**Auth middleware tests:**
```
- requireAuth: no token → 401
- requireAuth: invalid token → 401
- requireAuth: expired token → 401
- requireAuth: valid token → next() called with auth context
- optionalAuth: no token → next() called with unauthenticated context
```

**Analyze route tests (mock LLMService):**
```
- missing claim → 400
- missing components → 400
- valid request → 200 with verdict
- LLM service failure → 503 (after Phase 2.3 fix)
```

**Community route tests (mock Supabase):**
```
- submit: missing productName → 400
- submit: invalid verdict → 400
- submit: productName too long → 400
- submit: valid → 200
- search: valid query → 200 with results
- search: DB error → 500 (after Phase 2.5 fix)
```

**Pipeline integration tests (mock detector + OCR):**
```
- processFrame with 0 detections → empty components
- processFrame with detections → components with specs
- analyzeClaim with no components → throws
- full run() → complete verdict
```

**Definition of Done:**
- [ ] Auth middleware: 5+ test cases
- [ ] Analyze route: 4+ test cases
- [ ] Community route: 6+ test cases
- [ ] Pipeline: 4+ test cases
- [ ] All tests pass
- [ ] `npm test` runs all workspaces successfully

---

### 4.3 Wire Error UX to Screens

**Audit Finding:** C6 — Score 2
**Problem:** Structured error types and `ErrorBoundary` exist but aren't connected to actual screen states.

**Files to change:**
- `apps/mobile/app/(tabs)/index.tsx` (scan screen)
- `apps/mobile/app/scan-result.tsx` (result screen)

**Implementation:**

Use the existing `AppError` types and `getRecoveryMessage()` to show actionable error states:

```typescript
// In the scan screen, handle pipeline errors:
if (pipelineState.stage === 'error') {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Scan Failed</Text>
      <Text style={styles.errorMessage}>{pipelineState.error}</Text>
      <TouchableOpacity onPress={() => pipeline.reset()}>
        <Text>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}
```

Wire `OfflineBanner` to actual network state:
```typescript
// In _layout.tsx:
import NetInfo from '@react-native-community/netinfo';
const [isOffline, setIsOffline] = useState(false);
useEffect(() => {
  return NetInfo.addEventListener(state => setIsOffline(!state.isConnected));
}, []);
// Render <OfflineBanner visible={isOffline} /> in the layout
```

**Definition of Done:**
- [ ] Pipeline error states render user-friendly messages with recovery actions
- [ ] `OfflineBanner` connected to real network state
- [ ] "No components detected" state shows "Try better lighting" guidance
- [ ] "Model not loaded" state shows loading/retry UI

---

### 4.4 Clean Up Phantom Dependencies and Ghost Config

**Audit Finding:** #12 (LOW), #13 (LOW)

**Files to change:**
- `package.json` — remove `ajv`
- `apps/backend/src/env.ts` — remove `CACHE_TTL.SEARCH_RESULTS` or implement caching

**Implementation:**

```bash
# Remove ajv from root package.json
npm uninstall ajv
```

For `CACHE_TTL.SEARCH_RESULTS` — remove since search caching isn't implemented:
```typescript
// env.ts
export const CACHE_TTL = {
  DATASHEET: 60 * 60 * 24, // 24 hours
} as const;
```

**Definition of Done:**
- [ ] `ajv` removed from `package.json` and `package-lock.json`
- [ ] `CACHE_TTL.SEARCH_RESULTS` removed
- [ ] `npm install` succeeds cleanly
- [ ] No unused imports or phantom dependencies remain

---

### 4.5 Remove Dead Stub Modules

**Audit Finding:** B3
**Problem:** `apps/mobile/src/ar/`, `apps/mobile/src/community/`, `apps/mobile/src/storage/` contain only stub re-exports.

**Files to change:**
- `apps/mobile/src/ar/` — delete or clearly mark as placeholder
- `apps/mobile/src/community/` — delete or clearly mark
- `apps/mobile/src/storage/` — delete or clearly mark

**Implementation — Option A (delete):**
```bash
rm -rf apps/mobile/src/ar/
rm -rf apps/mobile/src/community/
rm -rf apps/mobile/src/storage/
```
Then remove any imports of these modules.

**Implementation — Option B (mark as placeholder):**
Add a `PLACEHOLDER.md` file in each:
```markdown
# Not Yet Implemented
This module is a placeholder. See REMEDIATION_PLAN.md Phase 2.
```

**Definition of Done:**
- [ ] Stub modules either deleted or clearly marked as unimplemented
- [ ] No imports reference deleted modules
- [ ] Documentation no longer describes these as functional

---

## Score Projections

After completing all 4 phases:

| Sub-criterion | Before | After | Change |
|--------------|--------|-------|--------|
| A1 (Commits) | 1 | 2 | Human iteration visible in remediation commits |
| A2 (Comments) | 1 | 1 | Not targeted (low ROI) |
| A3 (Tests) | 2 | 3 | Error-path, integration, and route handler tests added |
| A4 (Imports) | 2 | 3 | Phantom deps removed |
| A5 (Naming) | 1 | 1 | Not targeted (cosmetic) |
| A6 (Docs) | 1 | 2 | Docs right-sized to reality |
| A7 (Deps) | 2 | 3 | All deps used or removed |
| B1 (Errors) | 2 | 3 | LLM errors propagated, community routes return proper errors |
| B2 (Config) | 2 | 3 | ENVIRONMENT wired, ghost config removed |
| B3 (Call Chain) | 1 | 2-3 | Mock detection gated, OCR functional, stubs removed |
| B4 (Async) | 3 | 3 | Already strong |
| B5 (State) | 2 | 3 | setInterval removed, singleton cleanup added |
| B6 (Security) | 1 | 3 | JWT verified, auth enforced, spam protection wired |
| B7 (Resources) | 2 | 3 | Timeout added, concurrency bounded |
| C1 (API) | 3 | 3 | Already strong |
| C2 (UI) | 2 | 2 | Not targeted (requires full screen implementation) |
| C3 (State Mgmt) | 2 | 2 | Not targeted (requires Zustand integration) |
| C4 (Security Infra) | 1 | 3 | Auth enforced, CORS fixed, body limits, sanitization |
| C5 (WebSocket) | 1 | 1 | Not applicable — remove from docs |
| C6 (Error UX) | 2 | 3 | Error states wired to screens |
| C7 (Logging) | 1 | 2 | Structured request logging with correlation IDs |

**Projected scores:**
```
Domain A: 16/21 = 76.2% (was 47.6%)
Domain B: 20/21 = 95.2% (was 61.9%)
Domain C: 16/21 = 76.2% (was 57.1%)

Weighted = (76.2% × 0.20) + (95.2% × 0.50) + (76.2% × 0.30)
         = 15.24% + 47.60% + 22.86%
         = 85.7%

Vibe-Code Confidence = 14.3% (was 42.4%)
Classification: Mostly Authentic
```

---

## Execution Order & Dependencies

```
Phase 1 (Security) ─── no dependencies, do first
  ├── 1.1 JWT verification
  ├── 1.2 Enforce auth (depends on 1.1)
  ├── 1.3 Wire spam protection
  ├── 1.4 Environment CORS
  ├── 1.5 Input sanitization
  └── 1.6 Body size limits

Phase 2 (Pipeline) ─── can start in parallel with Phase 1
  ├── 2.1 Real ML model / honest fallback
  ├── 2.2 Real OCR integration
  ├── 2.3 LLM error propagation
  ├── 2.4 API request timeout
  └── 2.5 Stop swallowing errors

Phase 3 (Hardening) ─── after Phase 1
  ├── 3.1 Fix rate limiter (depends on 1.4 for ENVIRONMENT)
  ├── 3.2 Structured logging
  ├── 3.3 Bounded R2 concurrency
  └── 3.4 Singleton cleanup

Phase 4 (Honesty) ─── after Phase 2
  ├── 4.1 Right-size docs (depends on 2.1, 2.2 for status)
  ├── 4.2 Add missing tests (depends on all Phase 1-2 fixes)
  ├── 4.3 Wire error UX
  ├── 4.4 Clean phantom deps
  └── 4.5 Remove dead stubs
```

---

*Each task has clear success criteria. Check off items as you complete them. Re-run the vibe check audit after Phase 4 to verify the score improvement.*
