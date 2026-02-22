# SpecCheck - Architecture

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Mobile | React Native + Expo | Single codebase, managed native modules, JS ecosystem |
| ML Detection | TFLite (Android) / Core ML (iOS) | On-device, ~30ms inference, ~5MB quantized |
| OCR | ML Kit (Android) / Vision (iOS) | Free, fast, on-device |
| State | Zustand + AsyncStorage persistence | Minimal boilerplate, TS-native, ~1KB |
| Local Storage | SQLite via expo-sqlite | Relational queries, proven, Expo-supported |
| Backend | Hono on Cloudflare Workers | Edge deployment, TypeScript, no servers |
| Database | PostgreSQL on Supabase | Managed, full-text search, row-level security |
| Cache | Cloudflare KV | Edge caching, TTL-based expiry |
| Asset Storage | Cloudflare R2 | No egress fees, S3-compatible |
| LLM | Claude API (Anthropic) | Structured output, strong reasoning |
| Auth | Anonymous-first, optional Supabase Auth | Core features need no account |

## Feature Status

| Component | Status | Notes |
|-----------|--------|-------|
| Camera capture | Implemented | expo-camera integration with permissions |
| Component detection (TFLite) | In progress | Model loads on-device; mock fallback in dev only |
| OCR (ML Kit) | In progress | Single ML Kit path, no fallback |
| Component matching | Implemented | Fuzzy + exact matching against datasheet DB |
| Datasheet lookup (API) | Working | KV-cached, Supabase-backed |
| Claim parser | Implemented | Handles "10k lumens", "2Ah", comma formatting |
| Constraint chain builder | Implemented | LED efficiency droop, battery discharge, thermal |
| Verdict generator | Implemented | Plausible / impossible / uncertain with confidence |
| LLM constraint analysis | Working | Claude API with retry + 30s timeout |
| AR overlay | Not started | UI stubs exist, no rendering logic |
| Community submissions | Backend ready | API routes wired; mobile UI not integrated |
| Community search | Backend ready | API routes wired; mobile UI not integrated |

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        MOBILE APP                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Camera  │→ │ ML Model │→ │   OCR    │→ │ Matching │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│       Pipeline: Camera → Detection → OCR → Match → Specs    │
│                              │                               │
│                        ┌─────┴─────┐                         │
│                        │  Zustand  │  (persisted via         │
│                        │   Store   │   AsyncStorage)         │
│                        └───────────┘                         │
└──────────────────────────│───────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE EDGE                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Datasheet   │  │   Analyze    │  │  Community   │       │
│  │   Routes     │  │    Routes    │  │    Routes    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│       │                   │                  │               │
│  ┌────┴────┐         ┌────┴────┐        ┌────┴────┐         │
│  │   KV    │         │ Claude  │        │   R2    │         │
│  │  Cache  │         │   API   │        │ Storage │         │
│  └─────────┘         └─────────┘        └─────────┘         │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                        SUPABASE                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  datasheets  │  │    users     │  │ submissions  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

## Processing Distribution

**On-device (always):** Camera capture, frame preprocessing, ML detection, OCR extraction, constraint chain calculation, local cache queries.

**Server (when needed):** Datasheet lookup (cache miss), LLM reasoning (ambiguous cases), community search/submissions.

## Monorepo Structure

```
SpecCheck/
├── apps/
│   ├── mobile/              # React Native + Expo
│   │   ├── app/             # Expo Router screens
│   │   └── src/
│   │       ├── camera/      # Camera capture
│   │       ├── recognition/ # ML detection, OCR, matching
│   │       ├── analysis/    # Constraint chain, verdict
│   │       ├── datasheet/   # Spec retrieval, offline cache
│   │       ├── pipeline/    # Orchestrator (8-stage flow)
│   │       ├── store/       # Zustand state
│   │       ├── ui/          # Shared components
│   │       └── utils/       # Network, errors, retry
│   └── backend/             # Cloudflare Workers (Hono)
│       └── src/
│           ├── routes/      # API endpoints
│           ├── services/    # LLM, Datasheet, Storage
│           ├── middleware/   # Auth, rate limit, logging
│           └── db/          # Supabase client, queries
├── packages/
│   └── shared-types/        # TypeScript types (source of truth)
└── docs/                    # This directory
```

## Data Flow (8 Stages)

```
CameraFrame → DetectedRegion[] → ExtractedText[] → MatchedComponent[]
    → ComponentWithSpecs[] → (+ Claim) → ConstraintChain → Verdict
```

| Stage | Input | Output | Where | Target |
|-------|-------|--------|-------|--------|
| 1. Capture | Camera sensor | CameraFrame | Device | 33ms |
| 2. Detection | Frame | DetectedRegion[] | Device (ML) | 30ms |
| 3. OCR | Regions + image | ExtractedText[] | Device | 50ms |
| 4. Matching | Text | MatchedComponent[] | Device + API | 10ms/500ms |
| 5. Spec Retrieval | Components | ComponentWithSpecs[] | Cache/API | 5ms/300ms |
| 6. Claim Input | User text | Claim | Device | - |
| 7. Constraint Chain | Specs + Claim | ConstraintChain | Device | 20ms |
| 8. Verdict | Chain | Verdict | Device | 10ms |

**End-to-end:** ~200ms cached, ~1000ms with API, ~3000ms with LLM.

## Key Types

All types live in `packages/shared-types/index.ts` (`@speccheck/shared-types`).

Core types: `ComponentCategory`, `SpecValue`, `ComponentSpecs`, `CameraFrame`, `DetectedRegion`, `ExtractedText`, `MatchedComponent`, `Claim`, `ChainLink`, `ConstraintChain`, `Verdict`.

API types: `DatasheetResponse`, `AnalyzeRequest`, `AnalyzeResponse`, `SubmitRequest`.

See source at `packages/shared-types/index.ts` for full definitions.
