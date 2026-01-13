# SpecCheck - Data Flow Design

## Overview

This document maps how data transforms as it moves through SpecCheck, from camera input to verdict output.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW OVERVIEW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Camera Frame → Detection → OCR → Matching → Specs → Analysis → Verdict    │
│                                                                             │
│  [Raw Image]   [Regions]  [Text] [Parts]   [Data]  [Chain]    [Result]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Stage 1: Frame Capture

**Input**: Physical world (PCB through camera lens)
**Output**: Digital image data

```
┌──────────────┐      ┌──────────────────────────────────────┐
│   Camera     │  →   │  CameraFrame                         │
│   Sensor     │      │  ├── image: Uint8Array (raw pixels)  │
└──────────────┘      │  ├── width: 1280                     │
                      │  ├── height: 720                     │
                      │  ├── timestamp: 1704567890123        │
                      │  └── orientation: 0                  │
                      └──────────────────────────────────────┘
```

**Processing details**:
- Preview stream: 720p @ 30fps (for real-time detection)
- Capture on tap: Full resolution (for detailed OCR)
- Frames processed every 100ms to balance performance and responsiveness

**Data volume**: ~2.7MB per frame (1280×720×3 bytes uncompressed)

---

## Stage 2: Region Detection

**Input**: CameraFrame
**Output**: Array of detected regions with bounding boxes

```
┌──────────────────────┐      ┌────────────────────────────────────┐
│  CameraFrame         │  →   │  DetectedRegion[]                  │
│  (raw image)         │      │  ┌────────────────────────────────┐│
└──────────────────────┘      │  │ region_id: "r_001"             ││
                              │  │ bbox: {x:120, y:340, w:80, h:40}││
                              │  │ confidence: 0.94                ││
                              │  │ category: "ic"                  ││
                              │  └────────────────────────────────┘│
                              │  ┌────────────────────────────────┐│
                              │  │ region_id: "r_002"             ││
                              │  │ bbox: {x:450, y:210, w:60, h:60}││
                              │  │ confidence: 0.87                ││
                              │  │ category: "led"                 ││
                              │  └────────────────────────────────┘│
                              └────────────────────────────────────┘
```

**Processing details**:
- On-device ML model (MobileNetV3 + SSD)
- Input resized to 320×320 for model
- Inference time: ~30ms
- Confidence threshold: 0.7 (below = ignored)

**Categories detected**:
```
ic          → Integrated circuits (black rectangular packages)
led         → LED packages (various form factors)
battery     → Cylindrical cells (18650, 21700)
pouch_cell  → Flat lithium polymer cells
capacitor   → Electrolytic and ceramic capacitors
inductor    → Coils and chokes
connector   → USB, barrel jack, headers
```

---

## Stage 3: OCR Extraction

**Input**: DetectedRegion + cropped image area
**Output**: Extracted text with confidence

```
┌──────────────────────┐      ┌────────────────────────────────────┐
│  DetectedRegion      │  →   │  ExtractedText                     │
│  + cropped image     │      │  ├── region_id: "r_001"            │
└──────────────────────┘      │  ├── lines: ["CREE", "XM-L2",      │
                              │  │           "U2 1A", "2019"]       │
                              │  ├── confidence: 0.91              │
                              │  └── cleaned: "CREE XM-L2 U2"      │
                              └────────────────────────────────────┘
```

**Processing details**:
- Platform OCR (MLKit / Vision framework)
- Post-processing fixes common misreads:
  - `0` ↔ `O`, `1` ↔ `I` ↔ `l`, `5` ↔ `S`, `8` ↔ `B`
- Manufacturer logo patterns recognized
- Part number extracted via category-specific regex

**Text cleaning pipeline**:
```
Raw OCR    →  Character fixes  →  Logo detection  →  Part number extraction
"XIVL-L2"  →  "XML-L2"         →  "CREE XML-L2"   →  part: "XM-L2", mfr: "CREE"
```

---

## Stage 4: Component Matching

**Input**: ExtractedText
**Output**: Matched component with manufacturer and part number

```
┌──────────────────────┐      ┌────────────────────────────────────┐
│  ExtractedText       │  →   │  MatchedComponent                  │
│  cleaned: "XM-L2"    │      │  ├── region_id: "r_001"            │
└──────────────────────┘      │  ├── part_number: "XM-L2"          │
                              │  ├── manufacturer: "Cree"          │
                              │  ├── category: "led"               │
                              │  ├── match_confidence: 0.95        │
                              │  └── datasheet_id: "cree_xml2_v3"  │
                              └────────────────────────────────────┘
```

**Matching hierarchy** (try in order):
```
1. Exact match     →  Local cache lookup by part number
2. Fuzzy match     →  Levenshtein distance < 2 on known parts
3. API lookup      →  Query backend datasheet service
4. LLM interpret   →  Send ambiguous text to LLM for identification
```

**Match states**:
```
confident   →  Single match, confidence > 0.9
partial     →  Multiple candidates or confidence 0.7-0.9
unknown     →  No match found, manual entry suggested
```

---

## Stage 5: Spec Retrieval

**Input**: MatchedComponent
**Output**: Full specifications from datasheet

```
┌──────────────────────┐      ┌────────────────────────────────────┐
│  MatchedComponent    │  →   │  ComponentSpecs                    │
│  part: "XM-L2"       │      │  ├── part_number: "XM-L2"          │
└──────────────────────┘      │  ├── manufacturer: "Cree"          │
                              │  ├── category: "led"               │
                              │  ├── source: "cache"               │
                              │  └── specs:                        │
                              │      ├── luminous_flux:            │
                              │      │   value: 1052               │
                              │      │   unit: "lm"                │
                              │      │   conditions: "at 3000mA"   │
                              │      ├── max_current:              │
                              │      │   value: 3000               │
                              │      │   unit: "mA"                │
                              │      └── forward_voltage:          │
                              │          value: 3.1                │
                              │          unit: "V"                 │
                              └────────────────────────────────────┘
```

**Spec retrieval sources**:
```
cache   →  Local SQLite (fastest, works offline)
api     →  Backend datasheet service
llm     →  LLM extraction from datasheet PDF (slowest, last resort)
```

**Key specs by category**:

| Category | Key Specs |
|----------|-----------|
| LED | luminous_flux, max_current, forward_voltage, thermal_resistance |
| LED Driver | max_output_current, input_voltage_range, efficiency |
| Battery Cell | capacity, max_continuous_discharge, internal_resistance |
| USB PD Controller | max_power, supported_voltages, max_current |
| Audio Amp | output_power, load_impedance, thd, supply_voltage |

---

## Stage 6: Claim Input

**Input**: User interaction
**Output**: Structured claim object

```
┌──────────────────────┐      ┌────────────────────────────────────┐
│  User Input          │  →   │  Claim                             │
│  "10,000 lumens"     │      │  ├── category: "lumens"            │
└──────────────────────┘      │  ├── value: 10000                  │
                              │  ├── unit: "lm"                    │
                              │  └── source: "user_input"          │
                              └────────────────────────────────────┘
```

**Claim parsing**:
- Natural language input accepted ("10k lumens", "10,000 lm", "10000 lumens")
- Unit normalization (mAh, Ah → mAh; W, kW → W)
- Category inference from unit

**Supported claim categories**:
```
lumens      →  Light output (flashlights)
mah         →  Battery capacity (power banks)
watts       →  Power output (chargers, speakers)
amps        →  Current output (chargers)
```

---

## Stage 7: Constraint Chain Analysis

**Input**: Claim + ComponentSpecs[]
**Output**: Constraint chain with bottleneck identified

```
┌──────────────────────┐      ┌────────────────────────────────────┐
│  Claim: 10000 lm     │  →   │  ConstraintChain                   │
│  Components: [...]   │      │  ├── claim: {value: 10000, ...}    │
└──────────────────────┘      │  ├── links:                        │
                              │  │   ┌─────────────────────────┐   │
                              │  │   │ LED: XM-L2              │   │
                              │  │   │ constraint: max_lumens  │   │
                              │  │   │ max_value: 1052 lm      │   │
                              │  │   │ is_bottleneck: true ●   │   │
                              │  │   └─────────────────────────┘   │
                              │  │   ┌─────────────────────────┐   │
                              │  │   │ Driver: PT4115          │   │
                              │  │   │ constraint: max_current │   │
                              │  │   │ max_value: 1200 mA      │   │
                              │  │   │ is_bottleneck: false    │   │
                              │  │   └─────────────────────────┘   │
                              │  ├── bottleneck: LED (1052 lm)     │
                              │  └── max_possible: 1052 lm         │
                              └────────────────────────────────────┘
```

**Chain building rules by category**:

**Flashlight (lumens claim)**:
```
LED max lumens at max current
    ↓
Driver max current output
    ↓
Battery max discharge → available current
    ↓
Thermal limit → sustainable current
    ↓
= Max sustainable lumens
```

**Power Bank (mAh claim)**:
```
Cell count × cell capacity = total Wh
    ↓
Convert to output mAh at stated voltage
    ↓
Apply conversion efficiency (85-90%)
    ↓
= Max deliverable mAh
```

**Charger (watts claim)**:
```
PD controller max power
    ↓
Transformer current handling
    ↓
Output capacitor rating
    ↓
Thermal limits
    ↓
= Max sustainable watts
```

---

## Stage 8: Verdict Generation

**Input**: ConstraintChain
**Output**: Human-readable verdict

```
┌──────────────────────┐      ┌────────────────────────────────────┐
│  ConstraintChain     │  →   │  Verdict                           │
│  max_possible: 1052  │      │  ├── result: "impossible"          │
│  claim: 10000        │      │  ├── claimed: 10000 lm             │
└──────────────────────┘      │  ├── max_possible: 1052 lm         │
                              │  ├── bottleneck: "LED (XM-L2)"     │
                              │  ├── explanation:                  │
                              │  │   "The XM-L2 LED maxes out at   │
                              │  │    1,052 lumens. The claimed    │
                              │  │    10,000 lumens is physically  │
                              │  │    impossible with this LED."   │
                              │  └── confidence: "high"            │
                              └────────────────────────────────────┘
```

**Verdict states**:
```
plausible   →  max_possible >= claimed (claim could be true)
impossible  →  max_possible < claimed (physics says no)
uncertain   →  Missing components or ambiguous specs
```

**Confidence levels**:
```
high        →  All components identified, clear constraint chain
medium      →  Some components partially matched
low         →  Key components missing, relying on assumptions
```

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   CAMERA          DETECTION         OCR            MATCHING                 │
│   ┌─────┐         ┌─────┐         ┌─────┐         ┌─────┐                  │
│   │     │  frame  │     │ regions │     │  text   │     │  components      │
│   │  📷 │ ──────► │ 🔍  │ ──────► │ 📝  │ ──────► │ 🔗  │ ──────►          │
│   │     │         │     │         │     │         │     │                  │
│   └─────┘         └─────┘         └─────┘         └─────┘                  │
│                                                                             │
│   ─────────────────────────────────────────────────────────────────────    │
│                                                                             │
│   SPECS           CLAIM            ANALYSIS        VERDICT                  │
│   ┌─────┐         ┌─────┐         ┌─────┐         ┌─────┐                  │
│   │     │  specs  │     │  claim  │     │  chain  │     │                  │
│   │ 📊  │ ──────► │ ❓  │ ──────► │ ⛓️  │ ──────► │ ✅❌ │                  │
│   │     │         │     │         │     │         │     │                  │
│   └─────┘         └─────┘         └─────┘         └─────┘                  │
│                                                                             │
│   [Datasheet      [User           [Constraint     [Final                   │
│    Lookup]         Input]          Chain]          Result]                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Storage Touchpoints

```
                    ┌─────────────────┐
                    │  Local SQLite   │
                    │  ─────────────  │
                    │  • datasheets   │
                    │  • scan_history │
                    │  • saved_items  │
                    │  • patterns     │
                    └────────┬────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │                        │                        │
    ▼                        ▼                        ▼
┌────────┐              ┌────────┐              ┌────────┐
│ Stage 4│              │ Stage 5│              │ Stage 8│
│Matching│              │ Specs  │              │Verdict │
│        │              │        │              │        │
│ Read:  │              │ Read:  │              │ Write: │
│patterns│              │datashee│              │history │
└────────┘              └────────┘              └────────┘
```

---

## External Service Touchpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND API                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  Datasheet   │   │     LLM      │   │  Community   │        │
│  │   Service    │   │   Service    │   │   Service    │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │                  │                  │                 │
└─────────│──────────────────│──────────────────│─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
     ┌────────┐         ┌────────┐         ┌────────┐
     │ Stage 4│         │ Stage 7│         │ Search │
     │ Stage 5│         │Analysis│         │ Submit │
     │        │         │        │         │        │
     │part_num│         │specs,  │         │listing,│
     │text    │         │claim   │         │verdict │
     └────────┘         └────────┘         └────────┘
```

**What goes to servers**:
- Part numbers (text only)
- Structured specs (JSON)
- Claims (category + value)
- User-initiated submissions

**What stays on device**:
- Raw images
- Camera frames
- Location data
- Device identifiers

---

## Latency Budget

| Stage | Target | Notes |
|-------|--------|-------|
| Frame capture | 33ms | 30fps preview |
| Region detection | 30ms | On-device ML |
| OCR extraction | 50ms | Platform APIs |
| Component matching | 10ms (cache) / 500ms (API) | Cache hit vs miss |
| Spec retrieval | 5ms (cache) / 300ms (API) | Cache hit vs miss |
| Constraint analysis | 20ms | Local computation |
| Verdict generation | 10ms | Local formatting |
| **Total (cached)** | **~160ms** | Real-time feel |
| **Total (API)** | **~1000ms** | Acceptable delay |
| **With LLM** | **~3000ms** | Show loading state |

---

## Summary

Data flows through 8 stages:

1. **Frame Capture** - Camera sensor → raw image bytes
2. **Region Detection** - Image → bounding boxes with categories
3. **OCR Extraction** - Regions → text strings
4. **Component Matching** - Text → identified parts
5. **Spec Retrieval** - Parts → datasheet values
6. **Claim Input** - User text → structured claim
7. **Constraint Analysis** - Specs + claim → chain with bottleneck
8. **Verdict Generation** - Chain → human-readable result

Each stage has defined inputs, outputs, and processing rules. The pipeline is designed for:
- **Speed**: Most processing on-device, aggressive caching
- **Privacy**: Images never leave device, only part numbers sent to servers
- **Resilience**: Graceful degradation when components can't be identified
