# SpecCheck - Codebase Structure

## Overview

The codebase is organized as a monorepo with code organized by **domain/feature**, not by file type.

```
SpecCheck/
├── apps/
│   ├── mobile/          # React Native mobile app
│   └── backend/         # Cloudflare Workers API
├── packages/
│   └── shared-types/    # Shared TypeScript types
└── docs/                # Documentation
```

---

## Directory Structure

```
SpecCheck/
│
├── apps/
│   │
│   ├── mobile/                      # React Native + Expo app
│   │   └── src/
│   │       ├── camera/              # Camera capture
│   │       │   ├── index.ts         # Module exports
│   │       │   ├── types.ts         # Camera types
│   │       │   ├── CameraView.tsx   # Main component
│   │       │   ├── useCamera.ts     # Camera hook
│   │       │   └── captureFrame.ts  # Frame capture utility
│   │       │
│   │       ├── recognition/         # Component detection
│   │       │   ├── index.ts
│   │       │   ├── types.ts
│   │       │   ├── ComponentDetector.ts
│   │       │   ├── OCREngine.ts
│   │       │   └── ComponentMatcher.ts
│   │       │
│   │       ├── ar/                  # AR overlay
│   │       │   ├── index.ts
│   │       │   ├── types.ts
│   │       │   ├── AROverlay.tsx
│   │       │   ├── ComponentMarker.tsx
│   │       │   ├── SpecCard.tsx
│   │       │   └── useOverlayState.ts
│   │       │
│   │       ├── datasheet/           # Spec retrieval
│   │       │   ├── index.ts
│   │       │   ├── types.ts
│   │       │   ├── DatasheetCache.ts
│   │       │   ├── DatasheetAPI.ts
│   │       │   └── SpecParser.ts
│   │       │
│   │       ├── analysis/            # Claim validation
│   │       │   ├── index.ts
│   │       │   ├── types.ts
│   │       │   ├── ClaimValidator.ts
│   │       │   ├── ConstraintChain.ts
│   │       │   ├── CategoryRules.ts
│   │       │   └── VerdictGenerator.ts
│   │       │
│   │       ├── community/           # Community features
│   │       │   ├── index.ts
│   │       │   ├── types.ts
│   │       │   ├── SubmissionForm.tsx
│   │       │   ├── SearchView.tsx
│   │       │   └── CommunityAPI.ts
│   │       │
│   │       ├── storage/             # Local persistence
│   │       │   ├── index.ts
│   │       │   ├── types.ts
│   │       │   ├── LocalDB.ts
│   │       │   ├── ScanHistory.ts
│   │       │   └── SavedProducts.ts
│   │       │
│   │       └── ui/                  # User interface
│   │           ├── index.ts
│   │           ├── screens/         # App screens
│   │           │   ├── index.ts
│   │           │   ├── ScanScreen.tsx
│   │           │   ├── ResultScreen.tsx
│   │           │   ├── HistoryScreen.tsx
│   │           │   ├── SavedScreen.tsx
│   │           │   ├── CommunityScreen.tsx
│   │           │   └── SettingsScreen.tsx
│   │           ├── components/      # Shared components
│   │           │   ├── index.ts
│   │           │   ├── Button.tsx
│   │           │   ├── Card.tsx
│   │           │   ├── SpecRow.tsx
│   │           │   └── VerdictBadge.tsx
│   │           └── theme/           # Design tokens
│   │               └── index.ts
│   │
│   └── backend/                     # Cloudflare Workers API
│       └── src/
│           ├── index.ts             # App entry point
│           ├── routes/              # API endpoints
│           │   ├── types.ts         # Request/response types
│           │   ├── datasheet.ts     # /api/datasheet/*
│           │   ├── analyze.ts       # /api/analyze/*
│           │   └── community.ts     # /api/community/*
│           ├── services/            # Business logic
│           │   ├── index.ts
│           │   ├── DatasheetService.ts
│           │   ├── LLMService.ts
│           │   └── StorageService.ts
│           ├── db/                  # Database
│           │   ├── index.ts
│           │   ├── client.ts        # Supabase client
│           │   └── schema.sql       # DB schema
│           └── utils/               # Utilities
│
├── packages/
│   └── shared-types/                # Shared types
│       ├── index.ts                 # Type definitions
│       └── package.json
│
└── docs/                            # Documentation
    ├── ProblemDefinition.md
    ├── DataFlow.md
    ├── ArchitectureDecisions.md
    └── CodebaseStructure.md
```

---

## Module Responsibilities

### Mobile App Modules

| Module | Responsibility | Key Files |
|--------|----------------|-----------|
| **camera** | Camera access, frame capture | `CameraView.tsx`, `captureFrame.ts` |
| **recognition** | ML detection, OCR, matching | `ComponentDetector.ts`, `OCREngine.ts` |
| **ar** | Overlay rendering, markers | `AROverlay.tsx`, `SpecCard.tsx` |
| **datasheet** | Spec lookup, caching | `DatasheetCache.ts`, `DatasheetAPI.ts` |
| **analysis** | Claim validation, verdicts | `ClaimValidator.ts`, `ConstraintChain.ts` |
| **community** | Submissions, search | `SubmissionForm.tsx`, `CommunityAPI.ts` |
| **storage** | Local SQLite persistence | `LocalDB.ts`, `ScanHistory.ts` |
| **ui** | Screens, components, theme | `screens/`, `components/`, `theme/` |

### Backend Modules

| Module | Responsibility | Key Files |
|--------|----------------|-----------|
| **routes** | API endpoint handlers | `datasheet.ts`, `analyze.ts`, `community.ts` |
| **services** | Business logic | `DatasheetService.ts`, `LLMService.ts` |
| **db** | Database operations | `client.ts`, `schema.sql` |

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CameraView.tsx`, `SpecCard.tsx` |
| Hooks | camelCase with `use` prefix | `useCamera.ts`, `useOverlayState.ts` |
| Utilities | camelCase | `captureFrame.ts` |
| Types | `types.ts` in each module | `camera/types.ts` |
| Index | `index.ts` exports module | `camera/index.ts` |
| Services | PascalCase with `Service` | `DatasheetService.ts` |

---

## Import Patterns

### Within Mobile App

```typescript
// Import from module index
import { CameraView, useCamera } from '../camera';
import { detectComponents } from '../recognition';
import { validateClaim } from '../analysis';

// Import types
import type { CameraFrame } from '../camera/types';
import type { DetectedRegion } from '../recognition/types';
```

### Shared Types

```typescript
// In mobile app
import type { ComponentSpecs, Verdict } from '@speccheck/shared-types';

// In backend
import type { AnalyzeRequest, AnalyzeResponse } from '@speccheck/shared-types';
```

### Backend Services

```typescript
// In route handlers
import { DatasheetService } from '../services';
import { getSupabase } from '../db';
```

---

## Module Boundaries

Each module should:

1. **Export via index.ts** - All public APIs go through the index
2. **Own its types** - Types in `types.ts` within the module
3. **Be self-contained** - Minimal dependencies on other modules
4. **Have clear responsibility** - One sentence description

### Allowed Dependencies

```
camera → (none)
recognition → camera (for CameraFrame type)
ar → recognition, analysis (for types)
datasheet → (none)
analysis → recognition, datasheet (for types)
community → datasheet, analysis (for types)
storage → (none)
ui → all modules
```

---

## Adding New Features

### Adding a new module

1. Create directory under `apps/mobile/src/`
2. Add `index.ts` with exports
3. Add `types.ts` with type definitions
4. Update this document

### Adding a new screen

1. Create file in `ui/screens/`
2. Export from `ui/screens/index.ts`
3. Add to navigation

### Adding a new API endpoint

1. Add route handler in `routes/`
2. Add types to `routes/types.ts`
3. Implement service logic in `services/`

---

## Key Principles

1. **Feature-first organization** - Code for a feature lives together
2. **Explicit exports** - Only export what's needed via index.ts
3. **Types with code** - Types live in the module that owns them
4. **Shared types in package** - API contracts in shared-types
5. **No circular dependencies** - Clear dependency direction
6. **Self-documenting** - Module index.ts has docstring explaining purpose
