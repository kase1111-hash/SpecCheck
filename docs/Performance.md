# SpecCheck - Performance Targets

## Overview

Performance targets drive architectural decisions. Each target has:
- **Target**: Ideal performance (✅ good)
- **Maximum/Minimum**: Acceptable threshold (⚠️ acceptable)
- Beyond threshold: ❌ poor, needs fixing

---

## Pipeline Stage Targets

| Stage | Target | Maximum | Drives |
|-------|--------|---------|--------|
| Camera preview | 30 fps | 24 fps | Preview resolution |
| Frame capture | 100ms | 200ms | Image compression |
| **ML detection** | **30ms** | **50ms** | Model size, input resolution |
| OCR per region | 50ms | 100ms | Region crop size |
| Matching (cache) | 5ms | 20ms | Cache structure |
| Matching (fuzzy) | 50ms | 100ms | Algorithm choice |
| Spec retrieval (cache) | 5ms | 20ms | SQLite indexes |
| Spec retrieval (API) | 300ms | 1000ms | Edge CDN, caching |
| Constraint chain | 20ms | 50ms | Algorithm complexity |
| Verdict generation | 10ms | 30ms | String formatting |

### Why These Numbers?

**30ms detection** → Enables 15fps overlay updates, feels real-time
**50ms OCR** → Multiple regions in parallel < 200ms total
**5ms cache hit** → SQLite indexed lookup
**300ms API** → Edge deployment (Cloudflare) achieves this

---

## End-to-End Targets

| Flow | Target | Maximum | User Experience |
|------|--------|---------|-----------------|
| Full scan (cached) | 200ms | 500ms | Instant feedback |
| Full scan (with API) | 1000ms | 2000ms | Brief loading indicator |
| Analysis with LLM | 3000ms | 5000ms | Progress indicator |
| Claim to verdict | 100ms | 300ms | No perceived delay |

### Pipeline Budget Breakdown

**Target: 200ms (all cached)**
```
Frame capture:     50ms
Detection:         30ms
OCR (4 regions):   80ms (20ms each, parallel)
Matching:          20ms
Spec retrieval:    20ms
─────────────────────────
Total:            200ms
```

**Target: 1000ms (with API)**
```
Frame capture:     50ms
Detection:         30ms
OCR:               80ms
Matching:          50ms
Spec retrieval:   700ms (API calls, parallel)
Analysis:          90ms
─────────────────────────
Total:           1000ms
```

---

## App Lifecycle Targets

| Event | Target | Maximum | Strategy |
|-------|--------|---------|----------|
| Cold start | 2000ms | 3000ms | Lazy load ML model |
| Warm start | 500ms | 1000ms | Keep model in memory |
| ML model load | 500ms | 1000ms | Async initialization |
| Screen transition | 100ms | 200ms | Native navigation |

### Cold Start Budget

```
JS bundle load:    500ms
React init:        200ms
Navigation ready:  100ms
Camera permission: 200ms
Camera ready:      500ms
ML model load:     500ms (async, camera shows first)
─────────────────────────
Total:           2000ms (model loads in background)
```

---

## Size Targets

| Asset | Target | Maximum | Why |
|-------|--------|---------|-----|
| ML model | 5MB | 10MB | Fast download, fits in memory |
| App bundle | 20MB | 30MB | Quick install |
| Cache max | 50MB | 100MB | Reasonable device storage |
| API request | 5KB | 20KB | Fast upload, low data usage |
| API response | 10KB | 50KB | Fast download |

### ML Model Size Budget

```
MobileNetV3-Small backbone:  2MB
SSD detection head:          1MB
Quantization overhead:       0.5MB
Metadata/labels:             0.1MB
─────────────────────────────────
Total (quantized INT8):      ~4MB
```

---

## Resource Targets

| Resource | Target | Maximum | Measurement |
|----------|--------|---------|-------------|
| Memory (scanning) | 150MB | 250MB | Profile during scan |
| Memory (idle) | 50MB | 100MB | Background state |
| CPU (detection) | 60% | 80% | Single core usage |
| Battery per scan | 0.1% | 0.2% | Estimate from CPU time |

---

## Quality Targets

| Metric | Target | Minimum | How to Measure |
|--------|--------|---------|----------------|
| Detection accuracy | 85% | 75% | Test set of labeled images |
| OCR accuracy | 90% | 80% | Test set of chip markings |
| Component match rate | 70% | 50% | % identified in test set |
| Verdict accuracy | 95% | 90% | Expert validation |
| Cache hit rate | 80% | 60% | Analytics |

---

## Performance Monitoring

### Recording Metrics

```typescript
import { measureTime, startMeasure } from './performance';

// Async operation
const result = await measureTime('detection.inference', async () => {
  return detector.detect(frame);
});

// Manual timing
const stopTimer = startMeasure('ocr.extraction');
const text = await ocr.extract(region);
const duration = stopTimer(); // Records and returns ms
```

### Budget Enforcement

```typescript
import { withPerformanceBudget } from './performance';

// Wrap function with automatic budget check
const detectWithBudget = withPerformanceBudget(
  detector.detect,
  'detectionInference'
);

// Violations logged automatically in dev
await detectWithBudget(frame);
// 🟡 Performance budget exceeded: detectionInference
//    Value: 65ms
//    Target: 30ms
//    Maximum: 50ms
//    Suggestion: Consider using a smaller ML model...
```

### Performance Report

```typescript
const monitor = getPerformanceMonitor();
const report = monitor.generateReport();

// {
//   metrics: {
//     'detection.inference': {
//       count: 42,
//       p50: 28,
//       p90: 35,
//       p99: 48,
//       status: 'good'
//     },
//     ...
//   },
//   warnings: ['specs.api: p90=850ms (acceptable)'],
//   summary: { good: 8, acceptable: 2, poor: 0 }
// }
```

---

## Optimization Strategies

### If Detection is Slow

1. Reduce input resolution (320×320 → 256×256)
2. Use INT8 quantized model
3. Enable GPU delegate (Android) / CoreML (iOS)
4. Process every other frame for preview

### If OCR is Slow

1. Reduce region size before OCR
2. Skip low-confidence detections
3. Batch regions if possible
4. Use platform OCR (MLKit/Vision)

### If API is Slow

1. Increase cache TTL
2. Add more bundled components
3. Prefetch likely lookups
4. Use edge deployment (Cloudflare Workers)

### If Cold Start is Slow

1. Defer ML model load until after camera ready
2. Use Hermes engine (React Native)
3. Reduce JS bundle size
4. Lazy load non-critical screens

### If Memory is High

1. Release camera frames immediately after use
2. Reduce detection batch size
3. Clear caches when backgrounded
4. Use thumbnail for history instead of full images

---

## Performance Testing

### Benchmark Test

```typescript
import { runBenchmark } from './performance/benchmark';

// Runs each stage 100 times, reports stats
const results = await runBenchmark({
  iterations: 100,
  warmup: 10,
  stages: ['detection', 'ocr', 'matching', 'analysis'],
});
```

### Stress Test

```typescript
import { runStressTest } from './performance/stress';

// Continuous scanning for 5 minutes
const results = await runStressTest({
  duration: 5 * 60 * 1000,
  measureMemory: true,
  measureBattery: true,
});
```

### CI Performance Gate

```yaml
# In CI pipeline
- name: Performance Test
  run: npm run test:perf
  env:
    PERF_THRESHOLD: strict  # Fail on any 'poor' rating
```

---

## Targets Summary

| Category | Key Target | Why It Matters |
|----------|------------|----------------|
| Detection | 30ms | Real-time overlay feel |
| Full scan | 200ms | Instant user feedback |
| Cold start | 2s | Quick to usefulness |
| Model size | 5MB | Fast download/load |
| Memory | 150MB | Mid-range device support |
| Accuracy | 85%+ | User trust |

**Golden rule**: If it feels slow, it is slow. Measure, set targets, optimize.
