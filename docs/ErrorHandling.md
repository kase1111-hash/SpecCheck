# SpecCheck - Error Handling

## Overview

This document describes how SpecCheck handles errors, edge cases, and failure modes throughout the application.

## Design Principles

1. **Fail gracefully** - Never crash; show helpful error messages
2. **Offer recovery** - Give users a way to fix or work around problems
3. **Degrade gracefully** - Work with partial data when possible
4. **Be honest** - Tell users when confidence is low

---

## Error Categories

| Category | Examples | User Impact |
|----------|----------|-------------|
| `camera` | Permission denied, capture failed | Can't scan |
| `detection` | Model not loaded, no components found | Limited analysis |
| `ocr` | Text extraction failed, unreadable | Manual entry needed |
| `matching` | No match found, ambiguous match | Lower confidence |
| `network` | Offline, API error, timeout | Use cached data |
| `storage` | Cache read/write failed | Degraded performance |
| `analysis` | Insufficient data | Uncertain verdict |
| `validation` | Invalid claim format | User correction needed |

---

## Failure Modes and Recovery

### Camera Failures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Permission denied | `useCameraPermissions()` returns denied | Show permission request UI |
| Camera not available | Device has no camera | Show error, suggest manual entry |
| Capture failed | `takePictureAsync()` throws | Retry automatically, then show error |
| Poor lighting | Detection confidence < 0.5 | Show lighting tips overlay |

```typescript
// Example: Camera permission handling
const [permission, requestPermission] = useCameraPermissions();

if (!permission?.granted) {
  return <PermissionRequestView onRequest={requestPermission} />;
}
```

### Detection Failures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Model not loaded | `detector.isReady() === false` | Show loading state, retry |
| No components | `regions.length === 0` | Suggest better angle/lighting |
| Low confidence | All `confidence < 0.7` | Show partial results with warning |
| Processing timeout | >5 seconds | Retry with lower resolution |

```typescript
// Example: Handling no detections
if (detections.length === 0) {
  return {
    status: 'no_components',
    message: 'No components detected',
    suggestions: [
      'Move closer to the circuit board',
      'Ensure good lighting',
      'Try a different angle',
    ],
    fallback: 'manual_entry',
  };
}
```

### OCR Failures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| No text found | `rawLines.length === 0` | Show manual entry option |
| Low confidence | `confidence < 0.7` | Show extracted text for confirmation |
| Garbled text | Regex doesn't match known patterns | Fuzzy match + manual confirmation |

```typescript
// Example: OCR with fallback
const extraction = await ocrEngine.extractFromRegion(image, region);

if (extraction.confidence < 0.7) {
  return {
    ...extraction,
    needsConfirmation: true,
    message: 'Please verify the detected text',
  };
}
```

### Matching Failures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| No match | `status === 'unknown'` | Offer manual entry |
| Multiple matches | `alternatives.length > 1` | Let user select |
| Low confidence | `confidence < 0.8` | Show alternatives |

```typescript
// Example: Handling ambiguous matches
if (match.status === 'partial') {
  return {
    primary: match,
    alternatives: match.alternatives,
    userAction: 'select_correct',
  };
}
```

### Network Failures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| Offline | `!isOnline()` | Use cached/bundled data |
| API error 4xx | `response.status >= 400` | Show error, no retry |
| API error 5xx | `response.status >= 500` | Retry with backoff |
| Timeout | Request takes >10s | Retry, then use cache |

```typescript
// Example: Fetch with retry and fallback
const result = await withRetry(
  () => fetchJson('/api/datasheet/' + partNumber),
  RetryConfigs.network
);

if (!result.ok) {
  // Try cache
  const cached = await cache.get(partNumber);
  if (cached) {
    return { ...cached, source: 'cache', stale: true };
  }
  // Try bundled data
  const bundled = getBundledComponent(partNumber);
  if (bundled) {
    return { ...bundled, source: 'bundled' };
  }
  // Give up
  throw Errors.noMatchFound(partNumber);
}
```

### Analysis Failures

| Failure | Detection | Recovery |
|---------|-----------|----------|
| No specs for components | All `specs === null` | Show 'uncertain' verdict |
| Missing key specs | Required spec not present | Note in verdict, lower confidence |
| Category not supported | Unknown claim category | Show 'cannot analyze' |

---

## Retry Strategy

### Exponential Backoff

```
Attempt 1: Immediate
Attempt 2: 1 second delay
Attempt 3: 2 seconds delay
Attempt 4: 4 seconds delay (max)
```

### Retry Configuration

```typescript
const RetryConfigs = {
  // Quick retry for local operations
  local: {
    maxAttempts: 2,
    initialDelay: 100,
    maxDelay: 500,
  },

  // Network operations
  network: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    jitter: true,
  },

  // Critical operations
  critical: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 30000,
  },
};
```

---

## Offline Mode

### Capabilities When Offline

| Feature | Offline Support | Notes |
|---------|-----------------|-------|
| Camera/Detection | ✅ Full | ML runs on-device |
| OCR | ✅ Full | Uses platform OCR |
| Component Matching | ⚠️ Limited | Bundled patterns only |
| Spec Lookup | ⚠️ Limited | Cache + bundled data |
| Claim Analysis | ⚠️ Limited | May lack some specs |
| Community Search | ❌ None | Requires network |
| Community Submit | ❌ None | Queued for later |

### Bundled Data

Common components are bundled with the app for offline use:

- **LEDs**: XM-L2, XP-G3, SST-40, LH351D
- **Drivers**: PT4115, TP4056, LM2596
- **Batteries**: Samsung 35E, Panasonic NCR18650B, Samsung 50E

### Offline Notice

```
📡 Offline mode: Limited to 3 component types (led, led_driver, battery_cell)
```

---

## User Feedback Components

### Status Indicators

| Color | Meaning | Example |
|-------|---------|---------|
| 🟢 Green | Success/Identified | Component matched |
| 🟡 Yellow | Warning/Partial | Low confidence match |
| 🔴 Red | Error/Failed | No match found |
| 🔵 Blue | Info/Action | Tap for details |

### Error Messages

Good error messages:
- ✅ "No components detected. Try moving closer to the circuit board."
- ✅ "Could not identify PT4115. Enter specs manually?"

Bad error messages:
- ❌ "Error: null reference exception"
- ❌ "Something went wrong"

### Recovery Actions

| Action | Button Text | When to Show |
|--------|-------------|--------------|
| `retry` | "Try Again" | Transient failures |
| `manual_entry` | "Enter Manually" | Detection/matching failed |
| `use_cached` | "Use Cached Data" | Network failure |
| `skip` | "Skip" | Optional step failed |
| `grant_permission` | "Open Settings" | Permission denied |

---

## Manual Entry Fallback

When automatic detection fails, users can enter component info manually:

```typescript
interface ManualEntryData {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  specs: {
    luminous_flux?: { value: string; unit: 'lm' };
    max_current?: { value: string; unit: 'mA' };
    // ...
  };
}
```

### Templates

Pre-built templates for common component types:

- **LED**: Lumens, max current, forward voltage
- **LED Driver**: Max output current, input voltage range
- **Battery Cell**: Capacity, voltage, max discharge
- **USB PD**: Max power, supported voltages

---

## Confidence Levels

### Component Match Confidence

| Level | Threshold | Display |
|-------|-----------|---------|
| High | ≥ 0.9 | Green checkmark |
| Medium | 0.7 - 0.9 | Yellow warning |
| Low | < 0.7 | Red X, suggest manual entry |

### Verdict Confidence

| Level | Criteria | Message |
|-------|----------|---------|
| High | All key components identified | "High confidence analysis" |
| Medium | Some components partially matched | "Analysis based on partial data" |
| Low | Key components missing | "Limited analysis - manual verification recommended" |

---

## Logging

### Error Logging

```typescript
logError(error, {
  screen: 'ScanScreen',
  action: 'captureFrame',
  userId: anonymousId,
});
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `error` | Unexpected failures, crashes |
| `warn` | Recoverable issues, degraded state |
| `info` | User actions, state changes |
| `debug` | Development only |

---

## Testing Edge Cases

### Test Scenarios

1. **No camera permission** → Shows permission request
2. **Empty frame (no components)** → Shows "No components" message
3. **Blurry image** → Low confidence, suggests retake
4. **Unknown component** → Offers manual entry
5. **Offline** → Shows offline banner, uses cache
6. **API timeout** → Retries, then uses cache
7. **Claim parsing fails** → Shows input error
8. **Impossible claim** → Red verdict with explanation

### Manual Testing Checklist

- [ ] Deny camera permission, then grant
- [ ] Capture image with no components
- [ ] Scan component not in database
- [ ] Enable airplane mode, then scan
- [ ] Enter invalid claim format
- [ ] Verify all error messages are user-friendly
