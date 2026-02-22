# SpecCheck - Development Guide

## Error Handling

### Error Categories

| Category | Examples | Recovery |
|----------|----------|----------|
| `camera` | Permission denied, capture failed | Permission UI, retry |
| `detection` | Model not loaded, no components | Loading state, lighting tips |
| `ocr` | Text extraction failed | Manual entry fallback |
| `matching` | No match, ambiguous match | Show alternatives, manual entry |
| `network` | Offline, API error, timeout | Cache fallback, retry with backoff |
| `analysis` | Insufficient data | Uncertain verdict with explanation |

### Error Types

The app uses a structured `AppError` type system defined in `apps/mobile/src/utils/errors.ts`:

- `Result<T, AppError>` — for operations that can fail
- `tryAsync` / `trySync` — wrappers that catch and convert errors
- `getRecoveryMessage()` — user-facing recovery suggestions
- `ErrorBoundary` component — catches React render errors

### Retry Strategy

```
Network:  3 attempts, 1s → 10s exponential backoff with jitter
Local:    2 attempts, 100ms → 500ms
LLM API:  3 attempts, 1s → 4s exponential backoff
```

### Offline Mode

| Feature | Offline | Notes |
|---------|---------|-------|
| Camera / Detection | Full | ML runs on-device |
| OCR | Full | Platform OCR |
| Matching | Limited | Bundled patterns only |
| Spec Lookup | Limited | Cache + bundled data |
| Community | None | Requires network |

## Performance Targets

### Pipeline Stages

| Stage | Target | Max | Notes |
|-------|--------|-----|-------|
| ML detection | 30ms | 50ms | MobileNetV3 + SSD, 320x320 input |
| OCR per region | 50ms | 100ms | Platform ML Kit / Vision |
| Matching (cache) | 5ms | 20ms | SQLite indexed lookup |
| Spec retrieval (API) | 300ms | 1000ms | Cloudflare edge |
| Constraint chain | 20ms | 50ms | Local computation |

### App Lifecycle

| Event | Target | Max |
|-------|--------|-----|
| Cold start | 2s | 3s |
| ML model load | 500ms | 1s |
| Screen transition | 100ms | 200ms |

### Size Budget

| Asset | Target | Max |
|-------|--------|-----|
| ML model | 5MB | 10MB |
| App bundle | 20MB | 30MB |
| Cache max | 50MB | 100MB |

## Running the Project

### Prerequisites

- Node.js >= 18
- npm >= 9
- Expo CLI (`npx expo`)

### Development

```bash
# Install dependencies
npm install

# Start mobile app
npm run mobile:start

# Start backend dev server
npm run backend:dev

# Run tests
npm test

# Type-check
npm run backend -- typecheck
```

### Backend Environment

Required environment variables (see `apps/backend/wrangler.toml`):

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous key
- `ANTHROPIC_API_KEY` — Claude API key
- `JWT_SECRET` — Secret for JWT verification
- `ENVIRONMENT` — `development` | `staging` | `production`

KV namespace: `DATASHEET_CACHE`
R2 bucket: `IMAGES`
