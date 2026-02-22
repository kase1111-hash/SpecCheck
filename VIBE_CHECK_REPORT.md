# SpecCheck — Vibe-Code Detection Audit v2.0

**Repository:** `kase1111-hash/SpecCheck`
**Audit Date:** 2026-02-22
**Codebase Size:** ~18,143 lines TypeScript/TSX across 100+ files
**Documentation Volume:** ~4,656 lines of markdown across 15 documentation files

---

## Executive Summary

SpecCheck is a React Native (Expo) mobile app with a Cloudflare Workers backend designed to verify hardware specification claims by analyzing PCB components via camera, OCR, and constraint chain analysis. The project demonstrates a clear and genuinely novel product concept, with well-structured shared types, a thoughtful analysis engine (ClaimParser, ConstraintChainBuilder, VerdictGenerator), and competent backend architecture using Hono + Supabase + Cloudflare R2.

However, the project exhibits strong signals of AI-assisted rapid generation. The commit history is entirely AI-authored (every branch follows `claude/*` naming). Critical ML/camera pipeline stages contain placeholder or mock implementations that would prevent the core feature from working in production. The documentation volume is disproportionately large for the project's maturity — 4,656 lines of docs for a v0.1.0 project with no deployment history. The JWT authentication implementation trusts unverified tokens, and several modules exist as scaffolding without functional integration.

The codebase contains real engineering depth in the analysis layer (non-linear LED efficiency models, configurable efficiency constants, comprehensive ConstraintChainBuilder tests) alongside hollow scaffolding in the recognition pipeline and security layers. This is a project that was conceptually designed by someone who understands electronics verification, then substantially generated and expanded by AI tooling.

---

## Scoring Summary

| Domain | Sub-criterion | Score (1-3) | Evidence Summary |
|--------|--------------|-------------|------------------|
| **A: Surface Provenance** | A1. Commit History | 1 | 100% AI-authored (`claude/*` branches), formulaic messages |
| | A2. Comment Archaeology | 1 | Uniform JSDoc on every export, zero TODOs with reasoning, no FIXMEs |
| | A3. Test Quality | 2 | Good ConstraintChainBuilder tests with domain logic; but no error-path, integration, or E2E tests |
| | A4. Import Hygiene | 2 | Mostly clean imports; `buffer` and `jpeg-js` deps used in mobile but not deeply integrated |
| | A5. Naming Consistency | 1 | Suspiciously uniform `camelCase` across 100+ files, zero deviations or abbreviations |
| | A6. Documentation vs Reality | 1 | Massive doc volume for v0.1.0; AR overlay, community layer documented but not functional |
| | A7. Dependency Utilization | 2 | Core deps (Hono, Supabase, expo-camera, TF.js) are integrated; `ajv` imported but unused in source |
| **A Domain Total** | | **10/21 (48%)** | |
| **B: Behavioral Integrity** | B1. Error Handling | 2 | Structured `AppError` system exists; but backend swallows errors to JSON, LLM returns `uncertain` on all failures |
| | B2. Configuration Wiring | 2 | ~80% wired: `Env` bindings consumed, `CACHE_TTL` used; but `ENVIRONMENT` var never read, `ADMIN_API_KEY` partially wired |
| | B3. Call Chain Completeness | 1 | ML model falls back to placeholder on load failure; OCR falls back to empty arrays; pipeline returns mock data in production path |
| | B4. Async Correctness | 3 | Proper async/await throughout; no blocking in event loop; TF.js tensors properly disposed in try/finally |
| | B5. State Management | 2 | Pipeline state machine is well-designed; but singletons lack cleanup lifecycle; `memoryStore` in rate limiter uses `setInterval` in module scope (leaks in Workers) |
| | B6. Security Implementation | 1 | JWT verification trusts unverified tokens (no signature check); `auth` middleware doesn't gate access (always calls `next()`); rate limiter uses KV for state (race conditions) |
| | B7. Resource Management | 2 | TF.js tensors disposed properly; R2 uploads have cleanup; but no bounded queue for concurrent requests, no graceful shutdown |
| **B Domain Total** | | **13/21 (62%)** | |
| **C: Interface Authenticity** | C1. API Design Consistency | 3 | Unified Hono router, consistent JSON responses, proper HTTP semantics, typed routes |
| | C2. UI Implementation Depth | 2 | Real Expo Router with tab navigation; CameraView is functional; but screens are thin wrappers |
| | C3. Frontend State Management | 2 | Pipeline state machine with subscribe pattern; but no global store (Zustand/Redux), no persistent state |
| | C4. Security Infrastructure | 1 | Rate limiting imported and mounted; `auth` middleware exists but doesn't enforce; no CSP, CORS is permissive |
| | C5. WebSocket Implementation | 1 | No WebSocket implementation; no real-time features despite AR overlay being documented |
| | C6. Error UX | 2 | ErrorBoundary component exists; structured error types with recovery actions; but no actual user-facing error screens wired |
| | C7. Logging & Observability | 1 | `console.log`/`console.error` only; no correlation IDs, no structured logging, no metrics |
| **C Domain Total** | | **12/21 (57%)** | |

---

## Weighted Authenticity & Vibe-Code Confidence

```
Domain A Authenticity: 10/21 = 47.6%
Domain B Authenticity: 13/21 = 61.9%
Domain C Authenticity: 12/21 = 57.1%

Weighted Authenticity = (47.6% × 0.20) + (61.9% × 0.50) + (57.1% × 0.30)
                      = 9.52% + 30.95% + 17.13%
                      = 57.6%

Vibe-Code Confidence  = 100% - 57.6% = 42.4%
```

### Classification: **Substantially Vibe-Coded** (36–60% range)

---

## Domain A: Surface Provenance (Detail)

### A1. Commit History — Score: 1 (Weak)

**Evidence:**
- Every branch in the repository follows the `claude/*` naming pattern: `claude/create-claude-md-qWygp`, `claude/audit-software-correctness-VqQCm`, `claude/code-review-fixes-l63or`, `claude/add-project-docs-Gh1zP`, `claude/add-main-screens-cSyjj`, etc.
- Commit messages are formulaic: "Add comprehensive software audit report", "Fix all audit issues: security, OCR, caching, and tests", "Implement backend services and wire up route handlers"
- No evidence of human iteration, debugging commits, reverted experiments, or WIP markers
- The entire project was built through sequential AI-generated PRs merged to main

**Assessment:** The commit history is 100% AI-authored with no human iteration markers.

### A2. Comment Archaeology — Score: 1 (Weak)

**Evidence:**
- Every exported class, function, and interface has a JSDoc comment — suspiciously uniform coverage
- Comments explain WHAT, never WHY: `/** Generate unique region ID */`, `/** Sleep for a given number of milliseconds */`
- Only 2 TODO comments found: `OCREngine.ts:84` ("TODO: Implement actual OCR using MLKit/Vision") and `ComponentMatcher.ts:180` ("TODO: Implement fuzzy matching") — both are feature stubs, not human iteration markers
- Zero FIXMEs, zero HACK markers, zero "this is a workaround for..." comments
- File-level comments are tutorial-style: `/** SpecCheck Backend API * Hono-based API running on Cloudflare Workers. */`

**Assessment:** Comment patterns are uniformly generated. No evidence of human annotation or iteration.

### A3. Test Quality — Score: 2 (Moderate)

**Evidence:**
- `ConstraintChainBuilder.test.ts` (673 lines) shows genuine domain understanding: tests LED efficiency droop, battery discharge limits, series voltage calculation, and confidence levels — `apps/mobile/__tests__/ConstraintChainBuilder.test.ts:271-362`
- `ClaimParser.test.ts` (180 lines) covers edge cases: comma formatting, k-multiplier, Ah-to-mAh conversion — `apps/mobile/__tests__/ClaimParser.test.ts:14-111`
- `VerdictGenerator.test.ts` (308 lines) tests display formatting and share export
- `LLMService.test.ts` tests parsing/validation but only via private method access (`(service as any).buildPrompt`) — no integration or error-path tests
- `env.test.ts` tests that constants equal themselves — trivial
- **Missing:** No integration tests, no E2E tests, no error-path tests for the pipeline, no camera/OCR tests, no API route handler tests

**Assessment:** The analysis layer tests demonstrate real understanding of the problem domain. Test coverage is partial — the happy paths of the core analysis engine are well-tested, but critical paths (pipeline errors, network failures, ML model failures) have zero coverage.

### A4. Import Hygiene — Score: 2 (Moderate)

**Evidence:**
- Most imports are granular and used: `import { Hono } from 'hono'`, `import type { AnalyzeRequest } from './types'`
- `ajv` is listed in root `package.json` dependencies but never imported in any source file — `package.json:44`
- `buffer` and `jpeg-js` are imported in `ComponentDetector.ts:9-10` and `ImagePreprocessor.ts:12` for image decoding — legitimate use
- No wildcard imports found
- `@react-native-ml-kit/text-recognition` is dynamically imported in `OCREngine.ts:137` — properly handles absence with fallback

**Assessment:** Mostly clean. One phantom dependency (`ajv`).

### A5. Naming Consistency — Score: 1 (Weak)

**Evidence:**
- Perfect camelCase consistency across every file, every variable, every function in 100+ files
- Interface names consistently use PascalCase with descriptive names: `ComponentWithSpecs`, `ConstraintChain`, `VerdictResult`
- File names consistently use PascalCase for classes, camelCase for utilities
- Zero abbreviations, zero deviations, zero personal style markers
- Even internal helper functions follow the exact same pattern: `generateRegionId`, `generateSessionId`, `generateFrameId`

**Assessment:** The naming is suspiciously uniform across 18,000+ lines. Human codebases at this scale invariably show organic variation.

### A6. Documentation vs Reality — Score: 1 (Weak)

**Evidence:**
- 4,656 lines of documentation for a v0.1.0 project with zero production deployments
- README describes functional AR overlay ("Point your camera at a PCB and components get highlighted in real-time") — the AR module (`apps/mobile/src/ar/`) contains only `index.ts` and `types.ts` with no implementation
- README describes community layer ("search the listing URL or product name") — community routes exist but have no frontend integration
- 9 documentation files in `/docs/`: ArchitectureDecisions (530 lines), DataFlow (457 lines), DataStructures (541 lines), ErrorHandling (353 lines), Performance (294 lines), Privacy (351 lines), ReleasePlan (397 lines) — massively disproportionate to actual code
- `Architecture.md` (611 lines) describes components that are stubs (AR, WebSocket, offline sync)

**Assessment:** Documentation volume is enormously inflated relative to implemented functionality. Multiple documented features (AR overlay, real-time processing, community search) exist only as stubs.

### A7. Dependency Utilization — Score: 2 (Moderate)

**Evidence:**
- Hono: Deeply integrated — routes, middleware, context typing — `apps/backend/src/index.ts:1-88`
- Supabase: Fully utilized — CRUD operations, text search, joins — `apps/backend/src/db/datasheets.ts`, `submissions.ts`
- TensorFlow.js: Integrated with model loading, preprocessing, inference, NMS — `apps/mobile/src/recognition/TFLiteModel.ts:1-439`
- expo-camera: Properly integrated with permissions, refs, capture — `apps/mobile/src/camera/CameraView.tsx`
- `ajv`: Listed in root `package.json` but never imported — phantom dependency
- `tesseract.js`: Dynamically imported as fallback in `OCREngine.ts:178` but untested

**Assessment:** Core dependencies are well-integrated. One phantom dep (`ajv`), one barely-used dep (`tesseract.js`).

---

## Domain B: Behavioral Integrity (Detail)

### B1. Error Handling — Score: 2 (Moderate)

**Evidence:**
- **Genuine:** Structured `AppError` type system with categories, codes, recovery actions — `apps/mobile/src/utils/errors.ts:10-258`
- **Genuine:** `tryAsync`/`trySync` wrappers return `Result<T, AppError>` — `errors.ts:195-222`
- **Genuine:** LLM service has retry logic with exponential backoff for transient errors — `LLMService.ts:66-135`
- **Problem:** LLM service returns `{ verdict: 'uncertain' }` on all failures instead of propagating errors — `LLMService.ts:140-146` — user sees "uncertain" verdict instead of knowing the analysis failed
- **Problem:** Backend community routes catch all errors and return empty results instead of error responses — `community.ts:106-109` returns `{ results: [], totalCount: 0 }` on failure
- **Problem:** `StorageService.deleteImage` catches and logs errors but returns `false` — `StorageService.ts:100-108` — caller can't distinguish "deleted" from "error"

**Assessment:** The error type system is thoughtful but the error handling at boundaries silently degrades. The LLM service's fail-to-uncertain pattern is particularly problematic — it presents a failed analysis as a real result.

### B2. Configuration Wiring — Score: 2 (Moderate)

**Evidence:**
- **Wired:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` all consumed in service initialization — `apps/backend/src/index.ts:56-61`
- **Wired:** `DATASHEET_CACHE` (KV), `IMAGES` (R2) bindings used in services
- **Wired:** `CACHE_TTL` constants consumed in DatasheetService — `DatasheetService.ts:55`
- **Ghost:** `ENVIRONMENT` variable defined in `env.ts:19` but never read anywhere — no dev/staging/prod behavior switching
- **Partial:** `ADMIN_API_KEY` checked in auth but only for admin user — `auth.ts:52-56` — no mechanism to create user API keys
- **Ghost:** `CACHE_TTL.SEARCH_RESULTS` defined (`env.ts:27`) but never used — search results are not cached

**Assessment:** ~80% of configuration is consumed. `ENVIRONMENT` is completely ghost config. `CACHE_TTL.SEARCH_RESULTS` is defined but unused.

### B3. Call Chain Completeness — Score: 1 (Weak)

**Evidence:**
- **Critical Gap:** `ComponentDetector.loadModel()` sets `useMockDetections = true` and `isModelLoaded = true` on failure — `ComponentDetector.ts:104-108`. This means the app silently falls back to mock detections (hardcoded LED, LED driver, battery cell objects) in production when no trained model exists. Since no actual model file ships with the project (`assets/models/` contains only `.gitkeep` and README), the mock path is **always** taken.
- **Critical Gap:** `TFLiteModel.loadModel()` creates a "placeholder model" (random weights) when no real model is provided — `TFLiteModel.ts:148-157`. This means ML inference returns random detections.
- **Critical Gap:** `OCREngine.runOCR()` delegates to `expo-image-manipulator` + `@react-native-ml-kit/text-recognition` which may not be installed, then falls back to `runFallbackOCR` which returns `[]` in dev mode — `OCREngine.ts:169-173`. The OCR pipeline effectively returns empty results.
- **Dead module:** `apps/mobile/src/ar/` contains only stub exports — the AR overlay feature described in README is unimplemented
- **Dead module:** `apps/mobile/src/community/` contains only stub exports — community frontend is unimplemented
- **Dead module:** `apps/mobile/src/storage/` contains only stub exports

**Assessment:** The core value proposition — "point your camera at a circuit board and see what's possible" — does not work. The ML model ships no weights, the OCR returns empty arrays, and the detector falls back to mock data. The analysis engine (ClaimParser → ConstraintChainBuilder → VerdictGenerator) works correctly when given real component data, but the pipeline that feeds it is hollow.

### B4. Async Correctness — Score: 3 (Strong)

**Evidence:**
- TF.js tensor operations properly disposed in try/finally blocks — `TFLiteModel.ts:380-400`
- `ComponentDetector.runInference()` disposes `imageTensor` after use — `ComponentDetector.ts:181`
- `tf.tidy()` used correctly in `ImagePreprocessor.ts` to prevent tensor leaks — `ImagePreprocessor.ts:91, 112, 148`
- Database operations use proper async/await with Supabase client
- No blocking I/O in async handlers
- Batch operations (`DatasheetService.getByPartNumbers`, `StorageService.uploadImages`) use `Promise.all` correctly

**Assessment:** Async patterns are consistently correct throughout. Tensor lifecycle management is properly handled.

### B5. State Management — Score: 2 (Moderate)

**Evidence:**
- **Genuine:** Pipeline state machine with clear stages (idle → detecting → extracting → matching → retrieving → analyzing → complete) — `Pipeline.ts:29-38`
- **Genuine:** Subscribe/notify pattern for state changes — `Pipeline.ts:104-109`
- **Problem:** Rate limiter `memoryStore` uses `setInterval(cleanupMemoryStore, 60000)` at module scope — `rateLimit.ts:75`. This leaks timers in Cloudflare Workers (which have request-scoped lifetimes). The interval never cleans up.
- **Problem:** All service classes use singleton pattern (`getComponentDetector()`, `getOCREngine()`, `getPipeline()`) with no cleanup lifecycle. Module-level `let` variables hold state indefinitely.
- **Problem:** `DatabaseManager` singleton holds a `SQLite.SQLiteDatabase` reference that survives across hot reloads but has no reconnection logic

**Assessment:** State architecture is well-designed but singleton lifecycle management has gaps. The `setInterval` in rate limiter is a real bug in the Workers environment.

### B6. Security Implementation — Score: 1 (Weak)

**Evidence:**
- **Critical:** JWT `verifyJwt()` function decodes the token payload but **never verifies the signature** — `auth.ts:84-103`. Comment says "In production, verify signature using secret key / For now, trust the token structure". Any client can forge a JWT with arbitrary claims.
- **Critical:** The `auth` middleware extracts auth info but **always calls `next()`** even for unauthenticated users — `auth.ts:155-167`. It's mounted on `/api/analyze/*` and `/api/community/submit` but doesn't gate access — it just sets metadata.
- **Problem:** Rate limiter uses non-atomic read-then-write on KV store — `rateLimit.ts:108-128`. Under concurrent requests, multiple requests can read the same count and all increment, allowing burst overflow.
- **Problem:** CORS allows `http://localhost:8081` in production config — `index.ts:46`
- **Problem:** No input sanitization on community submission `body.productName` or `body.verdict` — potential stored XSS if rendered in a web context
- **Problem:** `spamProtection` middleware exists (`auth.ts:211-267`) but is never mounted on any route
- **Positive:** Session cookies use `HttpOnly; SameSite=Strict` flags — `auth.ts:163`
- **Positive:** SHA-256 URL hashing for listing lookups — `submissions.ts:65-77`

**Assessment:** Security is largely decorative. The JWT implementation is a critical vulnerability — it trusts unverified tokens. The auth middleware doesn't enforce authentication. The spam protection middleware was written but never wired up.

### B7. Resource Management — Score: 2 (Moderate)

**Evidence:**
- **Genuine:** TF.js tensors properly managed with `dispose()` calls and `tf.tidy()` wrappers
- **Genuine:** R2 uploads include proper metadata (`contentType`, `cacheControl`, `uploadedAt`)
- **Genuine:** Database manager has `close()`, `vacuum()`, and `deleteDatabase()` methods — `Database.ts:136-169`
- **Problem:** No bounded concurrency for R2 uploads — `StorageService.uploadImages` fires `Promise.all` without limiting concurrent uploads
- **Problem:** No request timeout on the Claude API call — `LLMService.ts:68-85`. A slow response would hold the Worker for the full execution limit
- **Problem:** `memoryStore` in rate limiter grows unbounded between cleanup intervals (every 60s) and never deallocates on Worker shutdown

**Assessment:** Individual resource management is generally good (especially tensor cleanup), but system-level concerns (concurrency limits, timeouts, bounded growth) are not addressed.

---

## Domain C: Interface Authenticity (Detail)

### C1. API Design Consistency — Score: 3 (Strong)

**Evidence:**
- Unified Hono router with consistent path structure: `/api/datasheet/*`, `/api/analyze/*`, `/api/community/*` — `index.ts:84-86`
- Consistent JSON error responses with proper HTTP status codes (400, 401, 404, 429, 500)
- Typed route handlers with proper request validation — `analyze.ts:23-29`, `datasheet.ts:40-41`
- Rate limit headers consistently applied via middleware — `rateLimit.ts:187-189`
- Shared types package ensures consistency between frontend and backend — `packages/shared-types/index.ts`

**Assessment:** API design is clean and consistent. This is one of the strongest aspects of the codebase.

### C2. UI Implementation Depth — Score: 2 (Moderate)

**Evidence:**
- Real Expo Router with file-based routing and tab navigation — `app/(tabs)/_layout.tsx`
- `CameraView` component is functional with permission handling, capture, and overlay support — `CameraView.tsx:25-171`
- Screens exist for tabs (index, history, saved, settings) and results (scan-result, component-detail)
- UI components include ErrorBoundary, OfflineBanner, RetryButton, StatusIndicator
- **Problem:** Screen implementations are thin wrappers — `history.tsx`, `saved.tsx`, `settings.tsx` are likely minimal stubs
- **Problem:** No AR overlay implementation despite being a core documented feature

**Assessment:** Basic SPA structure is in place with real components, but screens lack depth and the marquee feature (AR overlay) is unimplemented.

### C3. Frontend State Management — Score: 2 (Moderate)

**Evidence:**
- Pipeline class implements a proper state machine with subscribe/notify — `Pipeline.ts:84-132`
- `PipelineState` interface tracks all stages from idle to complete with timing metrics — `Pipeline.ts:43-55`
- `apps/mobile/src/store/index.ts` exists (state store module)
- **Problem:** No global state management library (no Zustand, Redux, or Jotai imports)
- **Problem:** Database hooks module exists (`database/hooks.ts`) but relationship to React state is unclear
- **Problem:** No persistent state — closing and reopening the app loses all scan context

**Assessment:** Local state management via Pipeline is competent. Global app state management is absent or minimal.

### C4. Security Infrastructure — Score: 1 (Weak)

**Evidence:**
- Rate limiting middleware created and mounted — `index.ts:71-81`
- CORS middleware applied — `index.ts:45-49`
- Auth middleware mounted on analyze and submit routes — `index.ts:75-81`
- **Problem:** Auth middleware doesn't enforce (see B6 above)
- **Problem:** No Content Security Policy headers
- **Problem:** CORS allows `localhost` in what appears to be the production config
- **Problem:** No request body size limits
- **Problem:** No SSRF protection on community image URLs (`body.images` accepts arbitrary URLs — `community.ts:58-59`)

**Assessment:** Security middleware is imported and mounted but doesn't actually protect endpoints. The infrastructure is decorative.

### C5. WebSocket Implementation — Score: 1 (Weak)

**Evidence:**
- No WebSocket code exists anywhere in the codebase
- No real-time features implemented
- Architecture.md references real-time capabilities but they don't exist

**Assessment:** Not applicable to current functionality, but documented features imply it should exist.

### C6. Error UX — Score: 2 (Moderate)

**Evidence:**
- `ErrorBoundary` component with retry functionality — `ErrorBoundary.tsx:22-100`
- Structured error types with `recovery` actions for user guidance — `errors.ts:46-53`
- `getRecoveryMessage()` provides user-friendly action text — `errors.ts:247-258`
- `OfflineBanner` component exists for network status
- **Problem:** Error types are defined but not wired to actual UI states in screens
- **Problem:** Backend returns raw error strings in JSON — `community.ts:80-83`

**Assessment:** Error infrastructure is thoughtfully designed but incompletely wired to the user experience.

### C7. Logging & Observability — Score: 1 (Weak)

**Evidence:**
- All logging is `console.log`, `console.warn`, `console.error` — no structured logging
- No correlation IDs on requests
- No metrics collection
- No health check beyond `{ status: 'ok' }` — `index.ts:67`
- Performance timing tracked in Pipeline state (`timings` field) but not exported or collected — `Pipeline.ts:54`
- No error aggregation or alerting

**Assessment:** Logging is minimal console output. No production observability.

---

## High/Medium Severity Findings

| # | Severity | Finding | Location | Impact | Remediation |
|---|----------|---------|----------|--------|-------------|
| 1 | **HIGH** | JWT tokens accepted without signature verification | `auth.ts:78-103` | Any client can forge authentication tokens with arbitrary user IDs | Implement proper JWT verification using `jose` or `hono/jwt` with a secret key |
| 2 | **HIGH** | Auth middleware doesn't enforce authentication | `auth.ts:155-167` | Protected routes (`/api/analyze/*`, `/api/community/submit`) accessible without authentication | Use `requireAuth` middleware instead of `auth` for protected routes |
| 3 | **HIGH** | ML model always falls to mock detections | `ComponentDetector.ts:100-108`, `assets/models/` | Core feature (component detection) returns hardcoded fake results | Train and ship an actual TFLite model, or remove mock fallback from production builds |
| 4 | **HIGH** | OCR pipeline returns empty arrays | `OCREngine.ts:166-189` | No text extraction occurs — pipeline can never identify real components | Implement actual OCR integration or make ML Kit a required dependency |
| 5 | **MEDIUM** | Rate limiter race condition | `rateLimit.ts:108-128` | Concurrent requests can bypass rate limits via non-atomic KV read-write | Use Cloudflare Durable Objects or atomic counters for rate limiting |
| 6 | **MEDIUM** | `setInterval` in module scope | `rateLimit.ts:75` | Timer leaks in Cloudflare Workers (request-scoped runtime) | Move cleanup to request lifecycle or use KV TTL for automatic cleanup |
| 7 | **MEDIUM** | `spamProtection` middleware defined but never mounted | `auth.ts:211-267` | Spam protection code exists but is never applied to submission routes | Mount on `/api/community/submit` route |
| 8 | **MEDIUM** | CORS allows localhost in production | `index.ts:46` | Development origin permitted in production; use env-based config | Use `ENVIRONMENT` env var to conditionally include `localhost` |
| 9 | **MEDIUM** | No input sanitization on submissions | `community.ts:29-35` | `productName`, `verdict` passed directly to database without sanitization | Add input length limits and sanitize HTML entities |
| 10 | **MEDIUM** | Community routes accept arbitrary image URLs | `community.ts:58-59` | SSRF risk: attacker can submit URLs pointing to internal services | Validate image URLs against allowlist or require base64 upload only |
| 11 | **MEDIUM** | `ENVIRONMENT` config is ghost config | `env.ts:19` | No dev/staging/prod behavior differentiation | Wire `ENVIRONMENT` to CORS origins, logging levels, and mock detection behavior |
| 12 | **LOW** | `ajv` dependency unused | `package.json:44` | Phantom dependency adds unnecessary bundle weight | Remove from `package.json` |
| 13 | **LOW** | `CACHE_TTL.SEARCH_RESULTS` defined but unused | `env.ts:27` | Ghost config — search results are never cached despite TTL being defined | Either implement search result caching or remove the constant |
| 14 | **LOW** | No request timeout on Claude API calls | `LLMService.ts:68-85` | Slow LLM responses hold Worker execution for duration limit | Add `AbortController` with configurable timeout |

---

## What's Genuine

Evidence of real engineering depth in the codebase:

- **Constraint Chain Architecture:** The `ConstraintChainBuilder` demonstrates genuine understanding of electronics constraint analysis. The non-linear LED efficiency model (`calculateLedLumensAtCurrent` at `ConstraintChainBuilder.ts:64-90`) correctly models droop behavior with configurable linear/non-linear regions. This is not generic AI output — it reflects domain knowledge about LED physics.

- **Configurable Efficiency Constants:** `EFFICIENCY_CONFIG` (`ConstraintChainBuilder.ts:24-45`) provides realistic, differentiated efficiency values for power banks, chargers, and flashlights, with sub-component breakdown (DC-DC conversion, cable losses, thermal derating). These are grounded in real-world electronics.

- **Comprehensive Type System:** The shared types package (`packages/shared-types/index.ts`, 817 lines) is a well-organized taxonomy of the entire domain — from `ComponentCategory` through pipeline stages to API contracts. The `SpecKeys` constants (`index.ts:738-774`) map to real datasheet specifications.

- **Claim Parser Robustness:** `ClaimParser.ts` handles real-world input variations: "10k lumens", "10,000lm", "2ah" → 2000mAh, with proper validation bounds. Tests cover these edge cases thoroughly.

- **Test Domain Knowledge:** `ConstraintChainBuilder.test.ts` tests are substantive — verifying LED+driver+battery interaction, efficiency derating, bottleneck identification, and confidence calculation. These tests reflect understanding of the problem space, not just code structure.

- **Database Schema Design:** The PostgreSQL schema (`schema.sql`) uses proper indexing (GIN for JSONB specs, full-text search vectors), generated columns for search, and a reputation trigger system. This is competent database design.

- **Backend Architecture:** The Hono + Cloudflare Workers + Supabase + R2 stack is well-chosen and properly integrated. Service injection via middleware context is clean. Batch datasheet retrieval with cache-first strategy is well-implemented.

---

## What's Vibe-Coded

Evidence of AI-generated scaffolding without human verification:

- **Mock Detection Production Path:** The `ComponentDetector` silently falls back to mock data (3 hardcoded detections) when the model fails to load — which is always, since no model ships. The `isModelLoaded = true` flag is set on failure, disguising the mock path as a loaded state. (`ComponentDetector.ts:100-108`)

- **Placeholder ML Model:** `TFLiteModel.createPlaceholderModel()` builds a random-weight neural network that produces meaningless outputs, then logs "Model loaded successfully." (`TFLiteModel.ts:164-203`)

- **Hollow OCR Pipeline:** The OCR engine attempts dynamic imports of ML Kit (which may not be installed), then falls to `runFallbackOCR` which returns `[]` in dev mode or tries to dynamically import `tesseract.js` (also not a project dependency). The practical result is always empty text extraction. (`OCREngine.ts:110-189`)

- **JWT Without Verification:** The `verifyJwt` function parses the token payload but explicitly skips signature verification with a comment "In production, verify signature using secret key / For now, trust the token structure." This was never followed up on. (`auth.ts:78-103`)

- **Non-Enforcing Auth Middleware:** The `auth` middleware is mounted on protected routes but always calls `next()` regardless of authentication status. `requireAuth` exists but is never used. The `spamProtection` middleware was written but never wired to any route. (`auth.ts:155-167, 211-267`)

- **Documentation Volume Inflation:** 4,656 lines of documentation for a v0.1.0 project. Nine files in `/docs/` covering architecture decisions, data flow, data structures, error handling, performance, privacy, and a release plan — for a project that has never been deployed. The documentation describes features (AR overlay, offline sync, real-time updates) that don't exist in code.

- **Stub Modules:** `apps/mobile/src/ar/`, `apps/mobile/src/community/`, `apps/mobile/src/storage/` contain only re-export stubs. These modules are documented as if functional.

- **Uniformly Perfect Code Style:** 18,143 lines with zero style deviations, zero abbreviations, zero TODO comments that reflect human reasoning (the 2 TODOs found are structural placeholders). Every file follows the exact same JSDoc pattern.

---

## Remediation Checklist

### Critical (Block Production)
- [ ] **Ship a trained ML model** or remove mock detection fallback from production builds. The app's core feature doesn't work without real component detection.
- [ ] **Implement real OCR integration** — either make ML Kit a required dependency with proper error handling, or ship a working fallback (Tesseract.js as a real dependency, not a speculative dynamic import).
- [ ] **Fix JWT verification** — use `hono/jwt` middleware or `jose` library to verify token signatures against a secret.
- [ ] **Replace `auth` with `requireAuth`** on protected routes (`/api/analyze/*`, `/api/community/submit`).

### High Priority
- [ ] **Fix rate limiter race condition** — use Cloudflare Durable Objects or implement compare-and-swap on KV operations.
- [ ] **Remove `setInterval` from rate limiter** — use KV TTL-based cleanup instead of module-level timers.
- [ ] **Wire `spamProtection` middleware** to submission route.
- [ ] **Add input sanitization** on community submission fields (length limits, HTML entity encoding).
- [ ] **Environment-based CORS** — use `ENVIRONMENT` variable to conditionally include `localhost` origin.

### Medium Priority
- [ ] **Add request timeout** to Claude API calls using `AbortController`.
- [ ] **Wire `ENVIRONMENT` config** to control behavior (logging level, mock detection, CORS origins).
- [ ] **Validate image URLs** in community submissions or require base64 only.
- [ ] **Add request body size limits** to prevent oversized payloads.
- [ ] **Add integration tests** for the pipeline (detection → OCR → matching → specs → analysis).
- [ ] **Add API route handler tests** for backend endpoints.

### Low Priority
- [ ] **Remove `ajv` phantom dependency** from root `package.json`.
- [ ] **Remove or implement `CACHE_TTL.SEARCH_RESULTS`** — either cache search results or remove the constant.
- [ ] **Add structured logging** — at minimum, JSON output with request IDs.
- [ ] **Implement bounded concurrency** for R2 uploads and batch operations.
- [ ] **Reduce documentation to match reality** — remove or clearly mark features as "planned" vs "implemented".

---

*This audit was conducted using the Vibe-Code Detection Audit v2.0 methodology. Every finding includes specific file paths and line numbers. The goal is production-readiness, not judgment on development approach.*
