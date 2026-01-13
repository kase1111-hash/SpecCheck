# SpecCheck - Architecture Decisions

## Overview

This document records the technology choices for SpecCheck and the reasoning behind each decision.

---

## Decision 1: Platform

**Choice**: React Native with Expo

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| Native iOS + Android | Best performance, full API access | Two codebases, 2x development cost |
| Flutter | Single codebase, good performance | Dart ecosystem smaller, camera/AR libraries less mature |
| React Native (bare) | Single codebase, JS ecosystem | Complex native module setup |
| React Native + Expo | Single codebase, managed native modules | Some limitations on native access |
| PWA | No app store, instant updates | No camera/AR capabilities needed |

**Rationale**:
- **Single codebase** - One team can build for iOS and Android
- **JavaScript/TypeScript** - Large talent pool, familiar tooling
- **Expo manages complexity** - Camera, file system, ML inference handled by managed modules
- **Good enough performance** - UI at 60fps, ML inference via native bridges
- **Escape hatch exists** - Can eject to bare React Native if needed

**Trade-offs accepted**:
- Slightly larger app size (~20MB overhead)
- Some native features require custom dev clients
- Expo Go limitations during development

---

## Decision 2: Processing Location

**Choice**: Hybrid (device-primary, server-secondary)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING DISTRIBUTION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ON-DEVICE (always)              SERVER (when needed)          │
│   ─────────────────               ──────────────────            │
│   • Camera capture                • Datasheet lookup (cache miss)│
│   • Frame preprocessing           • LLM reasoning               │
│   • Component detection (ML)      • Community search            │
│   • OCR extraction                • Community submissions       │
│   • AR overlay rendering                                        │
│   • Constraint chain calc                                       │
│   • Local cache queries                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Rationale**:
- **Privacy** - Images never leave device; users trust us with camera access
- **Speed** - On-device ML is faster than network round-trip for detection
- **Offline capability** - Core functionality works without internet
- **Cost** - Server costs scale with API calls, not frame rate

**Server used only for**:
- Data the device doesn't have (datasheet database too large to bundle)
- Reasoning too complex for on-device rules (LLM for edge cases)
- Shared data (community verifications)

---

## Decision 3: ML Framework

**Choice**: TensorFlow Lite (Android) + Core ML (iOS) via Expo

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| TFLite only | Cross-platform consistency | Slower on iOS |
| Core ML only | Best iOS performance | No Android support |
| ONNX Runtime | Cross-platform | Less mobile-optimized |
| MediaPipe | Google-backed, good perf | More complex integration |
| Platform-specific | Best per-platform perf | Two model formats to maintain |

**Rationale**:
- **Platform-native performance** - TFLite on Android, Core ML on iOS
- **Expo compatibility** - `expo-ml` or `react-native-fast-tflite` bridges exist
- **Model conversion** - Train once in TensorFlow, convert to both formats
- **Size** - Quantized models ~5MB each

**Model architecture**:
```
MobileNetV3-Small + SSD detection head
├── Input: 320×320×3 RGB
├── Output: Bounding boxes + class probabilities
├── Classes: 8 component categories
├── Size: ~5MB quantized (INT8)
└── Inference: ~30ms on mid-range devices
```

---

## Decision 4: OCR Solution

**Choice**: Platform-native OCR (ML Kit on Android, Vision on iOS)

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| Tesseract | Open source, customizable | Slow, large, dated |
| ML Kit / Vision | Fast, accurate, free | Platform-specific APIs |
| Cloud Vision API | Most accurate | Requires network, privacy concern |
| Custom trained model | Optimized for chip markings | Training data needed, maintenance |

**Rationale**:
- **Free and fast** - No API costs, on-device processing
- **Good enough accuracy** - General OCR + our post-processing handles chip markings
- **No added dependencies** - Uses OS capabilities

**Post-processing layer** (custom code):
```typescript
// Handles chip marking conventions
cleanOCRResult(raw: string): string {
  // Fix common misreads
  // Recognize manufacturer codes
  // Extract part numbers with regex
}
```

---

## Decision 5: AR Framework

**Choice**: Lightweight custom overlay (not full ARKit/ARCore)

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| ARKit + ARCore | Full 3D, world tracking | Complex, battery drain, overkill |
| ViroReact | React Native AR | Heavy, maintenance concerns |
| Custom 2D overlay | Simple, fast, sufficient | No 3D, limited tracking |
| expo-three + AR | 3D capable | Complex setup |

**Rationale**:
- **Don't need 3D** - Components are flat on PCB surface
- **Simplicity** - 2D bounding boxes + labels are sufficient
- **Battery life** - Full AR drains battery quickly
- **Device support** - Works on devices without ARCore/ARKit

**Implementation approach**:
```
Camera preview (full screen)
    └── Overlay layer (absolute positioned)
        ├── Bounding boxes (View components)
        ├── Labels (Text components)
        └── Spec cards (Modal/Sheet components)
```

**Tracking strategy**:
- Feature point tracking for small movements
- Re-detect on significant camera movement
- Manual re-anchor button as fallback

---

## Decision 6: State Management

**Choice**: Zustand

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| Redux | Mature, devtools | Boilerplate heavy |
| MobX | Reactive, less boilerplate | Magic, harder to debug |
| Zustand | Simple, minimal, TS-friendly | Less ecosystem |
| Jotai | Atomic, bottom-up | Different mental model |
| React Context | Built-in | Re-render issues at scale |

**Rationale**:
- **Minimal boilerplate** - Define store, use hook, done
- **TypeScript native** - Full type inference
- **No providers** - Works anywhere without wrapping
- **Small** - ~1KB bundle impact
- **Sufficient** - App state is not complex enough to need Redux

**Store structure**:
```typescript
interface AppState {
  // Camera state
  cameraActive: boolean
  currentFrame: CameraFrame | null

  // Detection state
  detectedRegions: DetectedRegion[]
  matchedComponents: MatchedComponent[]

  // Analysis state
  currentClaim: Claim | null
  constraintChain: ConstraintChain | null
  verdict: Verdict | null

  // UI state
  selectedComponent: string | null
  expandedCards: string[]
}
```

---

## Decision 7: Local Storage

**Choice**: SQLite via `expo-sqlite`

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| AsyncStorage | Simple key-value | No queries, size limits |
| SQLite | Full SQL, fast queries | More setup |
| Realm | Object-oriented, reactive | Large dependency |
| WatermelonDB | Built on SQLite, sync-ready | Overkill for our needs |
| MMKV | Very fast key-value | No relational queries |

**Rationale**:
- **Query capability** - Need to search datasheets by part number
- **Proven** - SQLite is battle-tested
- **Expo support** - `expo-sqlite` is well-maintained
- **Sync-ready** - Can implement server sync later if needed

**Tables**:
```sql
datasheets        -- Cached component specs
scans             -- User's scan history
saved_products    -- Bookmarked verifications
component_patterns -- Offline matching hints
```

---

## Decision 8: Backend Framework

**Choice**: Node.js with Hono (deployed on Cloudflare Workers)

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| Express on EC2 | Familiar, full control | Server management, scaling |
| FastAPI (Python) | Good for ML | Different language from frontend |
| Hono on Workers | Edge deployment, no servers | Some limitations |
| Go + Cloud Run | Fast, scalable | Different language |
| Serverless (Lambda) | Pay per use | Cold starts |

**Rationale**:
- **Same language** - TypeScript everywhere (frontend + backend)
- **Edge deployment** - Low latency globally via Cloudflare
- **No servers to manage** - Scales automatically
- **Cost effective** - Pay for actual requests, not idle time
- **Hono is fast** - Lightweight, designed for edge

**Backend services**:
```
/api/datasheet/:part     → Lookup component specs
/api/datasheet/search    → Fuzzy search datasheets
/api/datasheet/identify  → Identify from OCR text
/api/analyze/claim       → LLM reasoning endpoint
/api/community/search    → Search verifications
/api/community/submit    → Submit new verification
```

---

## Decision 9: LLM Integration

**Choice**: Claude API (Anthropic)

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| GPT-4 | Capable, well-known | Higher cost, rate limits |
| Claude | Good reasoning, structured output | Anthropic ecosystem |
| Gemini | Google integration | API stability concerns |
| Local LLM | Privacy, no API cost | Too slow/large for mobile |
| Fine-tuned small model | Fast, cheap | Training data needed |

**Rationale**:
- **Strong reasoning** - Claude excels at step-by-step analysis
- **Structured output** - Reliably returns JSON for parsing
- **Cost** - Competitive pricing for our use case
- **Context window** - Can include multiple datasheets if needed

**Usage constraints**:
- Only called for ambiguous cases (not every scan)
- Structured prompts with few-shot examples
- Strict output format for reliable parsing
- Fallback to rule-based verdict if LLM fails

---

## Decision 10: Datasheet Database

**Choice**: PostgreSQL on Supabase + edge caching

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| Self-hosted Postgres | Full control | Maintenance burden |
| Supabase | Managed Postgres, good DX | Vendor dependency |
| PlanetScale (MySQL) | Serverless scaling | MySQL syntax |
| MongoDB | Flexible schema | Overkill for structured data |
| SQLite (Turso) | Edge-native | Newer, less proven |

**Rationale**:
- **Managed** - Don't want to maintain database servers
- **Postgres** - Standard SQL, full-text search, JSON support
- **Supabase DX** - Good client libraries, dashboard, auth
- **Row-level security** - Built-in for community features

**Caching strategy**:
```
Request → Cloudflare KV (edge cache, 30 days TTL)
              ↓ miss
        → Supabase Postgres
              ↓
        → Cache result in KV
```

---

## Decision 11: Image/Asset Storage

**Choice**: Cloudflare R2

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| AWS S3 | Standard, reliable | Egress costs |
| Cloudflare R2 | No egress fees | Newer |
| Supabase Storage | Integrated with DB | Less edge integration |
| Backblaze B2 | Cheap | Fewer edge locations |

**Rationale**:
- **No egress fees** - Community images served without bandwidth cost
- **Cloudflare integration** - Works seamlessly with Workers
- **S3-compatible API** - Easy migration if needed

**Used for**:
- Community submission images
- Cached datasheet PDFs (for reference links)
- App assets that update outside app store releases

---

## Decision 12: Authentication

**Choice**: Anonymous-first with optional Supabase Auth

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| No auth | Simplest | Can't track contributions |
| Firebase Auth | Well-known | Google dependency |
| Supabase Auth | Integrated with DB | Another Supabase dependency |
| Auth0 | Feature-rich | Cost at scale |
| Clerk | Modern DX | Another vendor |

**Rationale**:
- **Anonymous by default** - Core features don't need accounts
- **Optional sign-in** - Only for community contributions
- **Supabase integration** - Already using Supabase for DB
- **Minimal data** - Email only, no social profiles needed

**Auth flow**:
```
Core features (scan, detect, verify)  →  No auth required
Community search                       →  No auth required
Community submit                       →  Auth required (email)
```

---

## Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOBILE APP                                  │
├─────────────────────────────────────────────────────────────────┤
│  Framework:      React Native + Expo                            │
│  Language:       TypeScript                                     │
│  State:          Zustand                                        │
│  Local Storage:  SQLite (expo-sqlite)                          │
│  ML:             TensorFlow Lite / Core ML                      │
│  OCR:            ML Kit / Vision (platform native)              │
│  AR:             Custom 2D overlay                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND                                     │
├─────────────────────────────────────────────────────────────────┤
│  Runtime:        Cloudflare Workers                             │
│  Framework:      Hono                                           │
│  Language:       TypeScript                                     │
│  Database:       PostgreSQL (Supabase)                          │
│  Cache:          Cloudflare KV                                  │
│  Storage:        Cloudflare R2                                  │
│  Auth:           Supabase Auth                                  │
│  LLM:            Claude API (Anthropic)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dependency Budget

Keeping dependencies minimal and justified:

**Mobile (must have)**:
```json
{
  "expo": "~50.x",
  "react-native": "0.73.x",
  "expo-camera": "~14.x",
  "expo-sqlite": "~13.x",
  "react-native-fast-tflite": "^1.x",
  "zustand": "^4.x"
}
```

**Mobile (nice to have)**:
```json
{
  "react-native-reanimated": "~3.x",    // Smooth animations
  "expo-image": "~1.x",                  // Better image handling
  "@supabase/supabase-js": "^2.x"       // Backend communication
}
```

**Backend**:
```json
{
  "hono": "^4.x",
  "@anthropic-ai/sdk": "^0.x",
  "@supabase/supabase-js": "^2.x"
}
```

**Total mobile dependencies**: <15 (excluding transitive)
**Total backend dependencies**: <10

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         React Native + Expo                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │  Camera  │  │ ML Model │  │ OCR      │  │ UI/AR    │            │   │
│  │  │  Module  │  │ TFLite/  │  │ MLKit/   │  │ Overlay  │            │   │
│  │  │          │  │ CoreML   │  │ Vision   │  │          │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │   │
│  │       │              │             │              │                 │   │
│  │       └──────────────┴─────────────┴──────────────┘                 │   │
│  │                              │                                       │   │
│  │                        ┌─────┴─────┐                                │   │
│  │                        │  Zustand  │                                │   │
│  │                        │   Store   │                                │   │
│  │                        └─────┬─────┘                                │   │
│  │                              │                                       │   │
│  │                        ┌─────┴─────┐                                │   │
│  │                        │  SQLite   │                                │   │
│  │                        │   Cache   │                                │   │
│  │                        └───────────┘                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
└────────────────────────────────────│────────────────────────────────────────┘
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLOUDFLARE EDGE                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Workers (Hono API)                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Datasheet   │  │   Analyze    │  │  Community   │              │   │
│  │  │   Routes     │  │    Routes    │  │    Routes    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                       │                      │                      │
│  ┌────┴────┐            ┌────┴────┐            ┌────┴────┐                 │
│  │   KV    │            │ Claude  │            │   R2    │                 │
│  │  Cache  │            │   API   │            │ Storage │                 │
│  └─────────┘            └─────────┘            └─────────┘                 │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SUPABASE                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PostgreSQL                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  datasheets  │  │    users     │  │ submissions  │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Decision Log Format

Future decisions should follow this format:

```markdown
## Decision N: [Topic]

**Choice**: [Selected option]

**Alternatives considered**:
| Option | Pros | Cons |
|--------|------|------|
| ... | ... | ... |

**Rationale**:
- [Reason 1]
- [Reason 2]

**Trade-offs accepted**:
- [Trade-off 1]
```

This keeps decisions documented and revisitable.
