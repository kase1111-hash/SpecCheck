# SpecCheck - Data Structures

## Overview

This document describes all data structures used in SpecCheck, organized by domain.

All types are defined in `packages/shared-types/index.ts` and can be imported from `@speccheck/shared-types`.

---

## Type Organization

```
@speccheck/shared-types
├── 1. Core Domain Types      # Components, specs, categories
├── 2. Pipeline Stage Types   # Camera → Detection → OCR → Matching → Specs
├── 3. Analysis Types         # Claims, constraints, verdicts
├── 4. API Types              # Request/response contracts
├── 5. Storage Types          # Cache, history, saved items
├── 6. UI State Types         # App state, preferences
├── 7. Category Spec Keys     # Standard keys per component type
└── 8. Utility Types          # Result, AsyncState, pagination
```

---

## 1. Core Domain Types

### ComponentCategory

All electronic component types we can identify:

```typescript
type ComponentCategory =
  | 'led'           // LED packages
  | 'led_driver'    // LED driver ICs
  | 'battery_cell'  // Li-ion cells
  | 'bms'           // Battery management
  | 'usb_pd'        // USB PD controllers
  | 'dc_dc'         // DC-DC converters
  | 'audio_amp'     // Audio amplifiers
  | 'motor_driver'  // Motor drivers
  | 'mcu'           // Microcontrollers
  | 'capacitor'     // Capacitors
  | 'inductor'      // Inductors
  | 'resistor'      // Resistors
  | 'connector'     // Connectors
  | 'ic_generic'    // Unclassified ICs
  | 'unknown';      // Could not categorize
```

### SpecValue

A single specification from a datasheet:

```typescript
interface SpecValue {
  value: number;           // Primary value (e.g., 1052)
  unit: string;            // Unit (e.g., "lm")
  conditions: string|null; // Test conditions (e.g., "at 3000mA")
  min: number | null;      // Minimum (for ranges)
  max: number | null;      // Maximum (for ranges)
  typical: number | null;  // Typical value
}

// Example
const ledLumens: SpecValue = {
  value: 1052,
  unit: "lm",
  conditions: "at 3000mA, Tj=25°C",
  min: 900,
  max: 1100,
  typical: 1052
};
```

### ComponentSpecs

Complete specifications for a component:

```typescript
interface ComponentSpecs {
  partNumber: string;                    // "XM-L2"
  manufacturer: string;                  // "Cree"
  category: ComponentCategory;           // "led"
  source: DataSource;                    // "cache" | "api" | "llm" | "manual"
  specs: Record<string, SpecValue>;      // Key-value specs
  datasheetUrl: string | null;           // Link to PDF
  lastUpdated: number;                   // Timestamp
}
```

---

## 2. Pipeline Stage Types

Data transforms through 5 stages from camera to specs:

### Stage 1: CameraFrame

```typescript
interface CameraFrame {
  id: string;              // Unique frame ID
  imageBase64: string;     // Image data
  width: number;           // 1280
  height: number;          // 720
  timestamp: number;       // Capture time
  orientation: 0|90|180|270;
  isFullResolution: boolean;
}
```

### Stage 2: DetectedRegion

```typescript
interface DetectedRegion {
  regionId: string;        // "r_001"
  frameId: string;         // Reference to frame
  bbox: BoundingBox;       // {x, y, width, height}
  confidence: number;      // 0.0 - 1.0
  category: ComponentCategory;
  detectedAt: number;
}

interface BoundingBox {
  x: number;      // Pixels from left
  y: number;      // Pixels from top
  width: number;
  height: number;
}
```

### Stage 3: ExtractedText

```typescript
interface ExtractedText {
  regionId: string;        // Reference to region
  rawLines: string[];      // ["CREE", "XM-L2", "U2 1A"]
  cleanedText: string;     // "CREE XM-L2 U2"
  confidence: number;      // OCR confidence
  words: OCRWord[];        // Individual words with positions
}
```

### Stage 4: MatchedComponent

```typescript
interface MatchedComponent {
  regionId: string;
  status: MatchStatus;     // "confident" | "partial" | "unknown"
  partNumber: string|null; // "XM-L2"
  manufacturer: string|null;
  category: ComponentCategory;
  confidence: number;
  datasheetId: string|null;
  alternatives: MatchCandidate[];  // Other possibilities
}
```

### Stage 5: ComponentWithSpecs

```typescript
interface ComponentWithSpecs {
  match: MatchedComponent;       // The match info
  specs: ComponentSpecs | null;  // Full specs (or null)
  error: string | null;          // Error if failed
}
```

---

## 3. Analysis Types

### Claim

A claim to validate:

```typescript
interface Claim {
  category: ClaimCategory;  // "lumens" | "mah" | "watts" | ...
  value: number;            // 10000
  unit: string;             // "lm"
  source: ClaimSource;      // "user_input" | "listing_ocr" | ...
  originalText: string;     // "10,000 lumens"
}
```

### ChainLink

One link in the constraint chain:

```typescript
interface ChainLink {
  component: ComponentWithSpecs;
  constraintType: ConstraintType;  // "max_output" | "max_current" | ...
  maxValue: number;                // 1052
  unit: string;                    // "lm"
  isBottleneck: boolean;           // true if this is the limit
  explanation: string;             // Human-readable
  sourceSpec: string;              // Which spec key
}
```

### ConstraintChain

Complete analysis:

```typescript
interface ConstraintChain {
  claim: Claim;
  links: ChainLink[];
  bottleneck: ChainLink | null;
  maxPossible: number;
  unit: string;
  verdict: VerdictResult;      // "plausible" | "impossible" | "uncertain"
  confidence: VerdictConfidence; // "high" | "medium" | "low"
}
```

### Verdict

Final result for display:

```typescript
interface Verdict {
  result: VerdictResult;
  confidence: VerdictConfidence;
  claimed: number;
  maxPossible: number;
  unit: string;
  bottleneck: string | null;
  explanation: string;
  details: string[];
  analyzedAt: number;
}
```

---

## 4. API Types

### Datasheet API

```typescript
// GET /api/datasheet/:partNumber
interface DatasheetResponse {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  specs: Record<string, SpecValue>;
  datasheetUrl: string | null;
  lastUpdated: number;
}

// POST /api/datasheet/search
interface DatasheetSearchRequest {
  query: string;
  category?: ComponentCategory;
  manufacturer?: string;
  limit?: number;
}

// POST /api/datasheet/identify
interface IdentifyRequest {
  textLines: string[];
  categoryHint?: ComponentCategory;
}
```

### Analyze API

```typescript
// POST /api/analyze/claim
interface AnalyzeRequest {
  claim: Claim;
  components: ComponentSpecs[];
  productCategory: string;
}

interface AnalyzeResponse {
  verdict: VerdictResult;
  confidence: VerdictConfidence;
  maxPossible: number;
  unit: string;
  reasoning: string;
  chain: AnalyzeChainLink[];
}
```

### Community API

```typescript
// POST /api/community/submit
interface SubmitRequest {
  productName: string;
  listingUrl: string;
  claimedSpecs: Record<string, string>;
  actualSpecs: Record<string, string>;
  verdict: string;
  images: string[];
  componentList: ComponentSpecs[];
}

// GET /api/community/search
interface CommunitySearchParams {
  query: string;
  category?: string;
  limit?: number;
  offset?: number;
}
```

---

## 5. Storage Types

### DatasheetCacheEntry

Local SQLite cache:

```typescript
interface DatasheetCacheEntry {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  specsJson: string;           // JSON-encoded specs
  datasheetUrl: string | null;
  fetchedAt: number;
  expiresAt: number;
}
```

### ScanRecord

Scan history:

```typescript
interface ScanRecord {
  id: string;
  timestamp: number;
  claimCategory: ClaimCategory;
  claimValue: number;
  claimUnit: string;
  verdict: VerdictResult;
  confidence: VerdictConfidence;
  maxPossible: number;
  componentsJson: string;
  thumbnailUri: string | null;
}
```

### SavedProduct

Bookmarked products:

```typescript
interface SavedProduct {
  id: string;
  name: string;
  listingUrl: string | null;
  claimedSpecsJson: string;
  actualSpecsJson: string;
  verdict: VerdictResult;
  notes: string | null;
  thumbnailUri: string | null;
  createdAt: number;
  updatedAt: number;
}
```

---

## 6. UI State Types

### AppState

Complete app state:

```typescript
interface AppState {
  currentScreen: Screen;
  camera: CameraState;
  scan: ScanState;
  analysis: AnalysisState;
  preferences: UserPreferences;
}

type Screen = 'scan' | 'result' | 'history' | 'saved' | 'community' | 'settings';
```

### ScanState

Current scan progress:

```typescript
interface ScanState {
  stage: ScanStage;
  currentFrame: CameraFrame | null;
  detections: DetectedRegion[];
  matches: MatchedComponent[];
  components: ComponentWithSpecs[];
  errors: string[];
}

type ScanStage = 'idle' | 'detecting' | 'extracting' | 'matching' | 'loading_specs' | 'ready';
```

---

## 7. Category-Specific Spec Keys

Standard keys for each component category:

```typescript
const SpecKeys = {
  LED: {
    luminousFlux: 'luminous_flux',       // lumens
    forwardVoltage: 'forward_voltage',   // V
    maxCurrent: 'max_current',           // mA
    thermalResistance: 'thermal_resistance', // °C/W
  },
  LEDDriver: {
    maxOutputCurrent: 'max_output_current',  // mA
    inputVoltageMin: 'input_voltage_min',    // V
    inputVoltageMax: 'input_voltage_max',    // V
    efficiency: 'efficiency',                // %
  },
  BatteryCell: {
    nominalCapacity: 'nominal_capacity',     // mAh
    nominalVoltage: 'nominal_voltage',       // V
    maxContinuousDisch: 'max_continuous_discharge', // A
    internalResistance: 'internal_resistance', // mΩ
  },
  USBPD: {
    maxPower: 'max_power',           // W
    supportedVoltages: 'supported_voltages', // V
    maxCurrent: 'max_current',       // A
  },
  AudioAmp: {
    outputPower: 'output_power',     // W
    loadImpedance: 'load_impedance', // Ω
    thd: 'thd',                      // %
  },
};
```

**Usage:**

```typescript
import { SpecKeys } from '@speccheck/shared-types';

const lumens = component.specs[SpecKeys.LED.luminousFlux];
```

---

## 8. Utility Types

### Result

For operations that can fail:

```typescript
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Usage
function parseNumber(s: string): Result<number> {
  const n = Number(s);
  if (isNaN(n)) return { ok: false, error: 'Invalid number' };
  return { ok: true, value: n };
}
```

### AsyncState

For async operations:

```typescript
interface AsyncState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: string | null;
}
```

### PaginatedResponse

For paginated lists:

```typescript
interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}
```

---

## Data Flow Summary

```
CameraFrame
    │
    ▼ (ML detection)
DetectedRegion[]
    │
    ▼ (OCR)
ExtractedText[]
    │
    ▼ (matching)
MatchedComponent[]
    │
    ▼ (spec lookup)
ComponentWithSpecs[]
    │
    ▼ (+ Claim)
ConstraintChain
    │
    ▼
Verdict
```

Each stage has:
- **Input type** - What it receives
- **Output type** - What it produces
- **Result type** - Wrapper with metadata (timing, errors)

---

## Type Conventions

1. **Nullable fields** use `| null`, not `?:`
2. **Arrays** are typed as `Type[]`, not `Array<Type>`
3. **Records** use `Record<string, T>` for key-value maps
4. **Enums** are string literal unions, not TypeScript enums
5. **Timestamps** are numbers (ms since epoch), not Date objects
6. **IDs** are strings (UUIDs or generated)
7. **JSON fields** in storage are suffixed with `Json` (e.g., `specsJson`)
