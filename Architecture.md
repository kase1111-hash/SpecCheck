# SpecCheck - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Mobile App                                │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Camera     │  │  Component   │  │   AR         │         │
│  │   Input      │→ │  Recognition │→ │   Overlay    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                           │                                    │
│                           ▼                                    │
│                    ┌──────────────┐                            │
│                    │  Local       │                            │
│                    │  Datasheet   │                            │
│                    │  Cache       │                            │
│                    └──────────────┘                            │
│                           │                                    │
└───────────────────────────│────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │      Backend API        │
              │                         │
              │  ┌───────────────────┐  │
              │  │ Datasheet Service │  │
              │  └───────────────────┘  │
              │  ┌───────────────────┐  │
              │  │ LLM Reasoning     │  │
              │  └───────────────────┘  │
              │  ┌───────────────────┐  │
              │  │ Community DB      │  │
              │  └───────────────────┘  │
              └─────────────────────────┘
```

## Feature Status

| Component | Status | Notes |
|-----------|--------|-------|
| Camera capture | Implemented | expo-camera with permissions |
| Component detection (TFLite) | In progress | Model loads on-device; mock fallback in dev only |
| OCR (ML Kit) | In progress | Single ML Kit path, no fallback |
| Component matching | Implemented | Fuzzy + exact matching |
| Datasheet lookup (API) | Working | KV-cached, Supabase-backed |
| Claim parser | Implemented | Handles "10k lumens", "2Ah", comma formatting |
| Constraint chain builder | Implemented | LED droop, battery discharge, thermal |
| Verdict generator | Implemented | Plausible / impossible / uncertain |
| LLM constraint analysis | Working | Claude API with retry + 30s timeout |
| AR overlay | Not started | Types exist, no rendering logic |
| Community submissions | Backend ready | API routes wired; mobile UI not integrated |
| Community search | Backend ready | API routes wired; mobile UI not integrated |

## Mobile App Architecture

### Platform

React Native with Expo for cross-platform (iOS + Android).

Rationale:
- Single codebase for both platforms
- Good camera and AR library support
- JavaScript/TypeScript ecosystem familiar to web developers
- Expo handles native module complexity

### Core Modules

```
/src
├── /camera
│   ├── CameraView.tsx          # Main camera component
│   ├── ImageCapture.ts         # Still image capture
│   └── FrameProcessor.ts       # Real-time frame handling
│
├── /recognition
│   ├── ComponentDetector.ts    # On-device ML model wrapper
│   ├── OCREngine.ts            # Text extraction from chip markings
│   ├── ComponentMatcher.ts     # Match detected text to known parts
│   └── models/                 # TFLite/CoreML model files
│
├── /datasheet
│   ├── DatasheetCache.ts       # Local SQLite cache
│   ├── DatasheetAPI.ts         # Remote lookup
│   └── SpecParser.ts           # Extract key specs from datasheet data
│
├── /analysis
│   ├── ClaimValidator.ts       # Main claim checking logic
│   ├── ConstraintChain.ts      # Build and evaluate constraint chains
│   ├── CategoryRules.ts        # Category-specific validation rules
│   └── VerdictGenerator.ts     # Produce human-readable verdict
│
├── /pipeline
│   └── Pipeline.ts             # 8-stage orchestrator
│
├── /store
│   └── index.ts                # Zustand state (persisted via AsyncStorage)
│
└── /ui
    ├── /screens                # Main app screens
    ├── /components             # ErrorBoundary, OfflineBanner, etc.
    └── /theme                  # Colors, typography
```

## Component Recognition Pipeline

### Stage 1: Frame Capture

```typescript
CameraFrame {
  image: Uint8Array           // Raw image data
  width: number
  height: number
  timestamp: number
  orientation: number         // Device orientation
}
```

Camera runs at reduced resolution for real-time processing (720p). Full resolution capture on user tap for detailed OCR.

### Stage 2: Region Detection

On-device ML model identifies regions likely to contain components.

```typescript
DetectedRegion {
  bbox: BoundingBox           // x, y, width, height
  confidence: number          // 0-1
  category: ComponentCategory // "ic", "led", "battery", "capacitor", etc.
}
```

Model trained on PCB images to recognize:
- Integrated circuits (rectangular black packages)
- LED packages (various form factors)
- Cylindrical batteries (18650, 21700)
- Pouch cells
- Large capacitors
- Inductors
- Connectors

### Stage 3: OCR Extraction

For each detected region, run OCR to extract text markings.

```typescript
ExtractedText {
  region_id: string
  lines: string[]             // All text found
  confidence: number
  cleaned: string             // Normalized, common OCR errors fixed
}
```

Chip markings follow patterns:
- Manufacturer logo/code
- Part number
- Date code
- Lot number

OCR post-processing:
- Fix common misreads (0/O, 1/I, 5/S)
- Recognize manufacturer logo patterns
- Extract part number using regex patterns per manufacturer

### Stage 4: Component Matching

Match extracted text against known components.

```typescript
MatchedComponent {
  region_id: string
  part_number: string
  manufacturer: string
  category: ComponentCategory
  match_confidence: number
  datasheet_id: string | null
}
```

Matching hierarchy:
1. Exact part number match in local cache
2. Fuzzy match with common variations
3. Query backend datasheet service
4. LLM interpretation for ambiguous markings

### Stage 5: Spec Retrieval

Pull relevant specs for matched components.

```typescript
ComponentSpecs {
  part_number: string
  manufacturer: string
  category: ComponentCategory
  specs: Record<string, SpecValue>
  source: "cache" | "api" | "llm"
}

SpecValue {
  value: number
  unit: string
  conditions: string | null   // "at 25°C", "continuous", etc.
  min: number | null
  max: number | null
  typical: number | null
}
```

Key specs by category:

**LED**
- luminous_flux (lumens)
- forward_voltage (V)
- max_current (mA)
- thermal_resistance (°C/W)
- die_size (mm²)

**LED Driver IC**
- max_output_current (A)
- input_voltage_range (V)
- efficiency (%)
- switching_frequency (kHz)

**Battery Cell**
- nominal_capacity (mAh)
- nominal_voltage (V)
- max_continuous_discharge (A)
- max_pulse_discharge (A)
- internal_resistance (mΩ)

**USB PD Controller**
- max_power (W)
- supported_voltages (V[])
- max_current_per_voltage (A[])

**Audio Amplifier**
- output_power (W)
- load_impedance (Ω)
- thd (%)
- supply_voltage_range (V)

## AR Overlay System (Planned)

> **Status:** Not yet implemented. Types defined in `@speccheck/shared-types`. The planned approach uses lightweight 2D overlays (not full ARKit/ARCore) to keep complexity and battery impact low.

Planned visual hierarchy:
1. **Highlight boxes** - Color-coded by match status
2. **Labels** - Part number, tap to expand
3. **Spec cards** - Expanded view with key specs
4. **Constraint chain** - Shown during claim evaluation
5. **Verdict banner** - Final result

## Claim Validation Engine

### Constraint Chain Model

```typescript
ConstraintChain {
  claim: Claim
  links: ChainLink[]
  bottleneck: ChainLink | null
  max_possible: number
  unit: string
  verdict: "plausible" | "impossible" | "uncertain"
}

Claim {
  category: ClaimCategory     // "lumens", "watts", "mah", etc.
  value: number
  unit: string
  source: string              // Where the claim came from
}

ChainLink {
  component: MatchedComponent
  constraint_type: string     // "output", "current", "discharge", "thermal"
  max_value: number
  unit: string
  is_bottleneck: boolean
  explanation: string
}
```

### Category-Specific Validators

**Flashlight Validator**
```
Input: claimed lumens
Chain:
  1. LED: max lumens at max current
  2. Driver: max current output
  3. Battery: max continuous discharge → available current
  4. Thermal: heat dissipation capacity → sustainable current
Output: max sustainable lumens
```

**Power Bank Validator**
```
Input: claimed mAh
Chain:
  1. Cell count × cell capacity = total Wh
  2. Convert to output mAh at stated voltage
  3. Account for conversion efficiency (~85-90%)
Output: max deliverable mAh
```

**Charger Validator**
```
Input: claimed watts
Chain:
  1. PD controller max power
  2. Transformer/inductor current handling
  3. Output capacitor rating
  4. Thermal limits of package
Output: max sustainable output power
```

### LLM Reasoning Layer

For complex or ambiguous cases, send structured query to LLM.

```typescript
LLMQuery {
  claim: Claim
  components: ComponentSpecs[]
  category: string
  question: string            // Specific question to answer
}

LLMResponse {
  reasoning: string           // Step-by-step analysis
  conclusion: string          // Direct answer
  confidence: "high" | "medium" | "low"
  caveats: string[]           // Things that could affect the answer
}
```

LLM handles:
- Unusual component combinations
- Components not in datasheet database
- Nuanced thermal analysis
- Explaining the verdict in plain language

Keep LLM queries minimal and structured. Send component IDs and specs, not images.

## Backend Services

### Datasheet Service

```
GET /datasheet/{part_number}
Response: {
  part_number: string
  manufacturer: string
  category: string
  specs: Record<string, SpecValue>
  datasheet_url: string       // Link to original PDF
  last_updated: timestamp
}

POST /datasheet/search
Body: { query: string, category?: string }
Response: { matches: DatasheetSummary[] }

POST /datasheet/identify
Body: { text_lines: string[], category_hint?: string }
Response: { matches: DatasheetMatch[], confidence: number }
```

Datasheet database sources:
- Manufacturer official datasheets (scraped/indexed)
- Distributor databases (Digi-Key, Mouser, LCSC)
- Community contributions
- LLM extraction from PDF datasheets

### LLM Reasoning Service

```
POST /analyze/claim
Body: {
  claim: Claim
  components: ComponentSpecs[]
  category: string
}
Response: {
  verdict: "plausible" | "impossible" | "uncertain"
  max_possible: number
  unit: string
  reasoning: string
  chain: ChainLink[]
}
```

Uses Claude API with structured prompting:
- System prompt defines the constraint chain methodology
- Few-shot examples for common categories
- Strict output format for parsing

### Community Service

```
POST /community/submit
Body: {
  product_name: string
  listing_url: string
  claimed_specs: Record<string, string>
  actual_specs: Record<string, string>
  verdict: string
  images: string[]            // URLs to uploaded images
  component_list: ComponentSpecs[]
}

GET /community/search
Query: { q: string, category?: string }
Response: { results: CommunitySubmission[] }

GET /community/listing/{url_hash}
Response: CommunitySubmission | null
```

Moderation:
- Automated spam detection
- Community flagging
- Reputation system for contributors

## Local Data Storage

### SQLite Schema

```sql
-- Cached datasheets
CREATE TABLE datasheets (
  part_number TEXT PRIMARY KEY,
  manufacturer TEXT,
  category TEXT,
  specs_json TEXT,
  fetched_at INTEGER,
  expires_at INTEGER
);

-- Scan history
CREATE TABLE scans (
  id TEXT PRIMARY KEY,
  timestamp INTEGER,
  claim_category TEXT,
  claim_value REAL,
  verdict TEXT,
  max_possible REAL,
  components_json TEXT,
  thumbnail_path TEXT
);

-- Saved products
CREATE TABLE saved_products (
  id TEXT PRIMARY KEY,
  name TEXT,
  listing_url TEXT,
  claimed_specs_json TEXT,
  actual_specs_json TEXT,
  verdict TEXT,
  notes TEXT,
  created_at INTEGER
);

-- Offline component recognition hints
CREATE TABLE component_patterns (
  pattern TEXT PRIMARY KEY,
  part_number TEXT,
  manufacturer TEXT,
  category TEXT
);
```

### Cache Strategy

- Datasheets: Cache for 30 days, refresh on access if expired
- ML models: Bundle with app, update via app store
- Component patterns: Sync weekly from backend
- Community data: Search online, cache results for 24 hours

## ML Model Architecture

### Component Detection Model

- Architecture: MobileNetV3 + SSD head
- Input: 320x320 RGB
- Output: Bounding boxes + category classification
- Size: ~5MB quantized
- Inference: ~30ms on mid-range phone

Training data:
- Open Images PCB dataset
- Custom labeled PCB images
- Synthetic augmentation (rotation, lighting, blur)

### OCR Model

Use platform OCR (MLKit on Android, Vision on iOS) with custom post-processing.

Post-processing model:
- Character-level corrections for chip marking conventions
- Manufacturer code recognition
- Part number extraction regex per manufacturer family

## Privacy Implementation

### On-Device Processing

All image processing stays on device:
- Frame capture → device only
- Component detection → on-device ML
- OCR → on-device
- AR rendering → on-device

### Server Communication

Only send to server:
- Part numbers for datasheet lookup
- Structured component specs for LLM analysis
- User-initiated community submissions

Never send:
- Raw images (unless user explicitly submits to community)
- Location data
- Device identifiers beyond anonymous session

### Data Minimization

```typescript
// What gets sent to LLM
LLMRequest {
  components: [
    { part: "XM-L2", category: "led", specs: { max_lumens: 1052, max_current: 3000 } },
    { part: "PT4115", category: "led_driver", specs: { max_current: 1200 } }
  ],
  claim: { type: "lumens", value: 10000 }
}

// What does NOT get sent
- Device ID
- User ID
- Images
- Location
- Time
- Any other metadata
```

## Development Phases

### Phase 1: Core Camera + Recognition (in progress)
- Camera integration (done)
- On-device component detection (model loading works; awaiting trained model)
- OCR pipeline (ML Kit path working; no fallback)
- Local datasheet cache with bundled common parts (done)

### Phase 2: Claim Validation (done)
- Constraint chain engine
- Category validators (flashlight, power bank, charger)
- LLM integration for reasoning
- Verdict display

### Phase 3: AR Experience (not started)
- 2D overlay rendering
- Spec cards with detail
- Visual constraint chain

### Phase 4: Community Features (backend done, mobile not started)
- Backend API routes for submit, search, recent
- Mobile submission UI and search UI still needed

### Phase 5: Expansion (not started)
- Additional categories (audio, motors, storage)
- Barcode/QR scanning
- Export/share verifications

## Performance Targets

- Camera preview: 30fps
- Detection overlay update: 15fps
- Full spec lookup: <2 seconds
- LLM verdict: <5 seconds
- App cold start: <3 seconds
- Offline mode: Full functionality except LLM reasoning and community search
