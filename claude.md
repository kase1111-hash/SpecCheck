# SpecCheck

X-ray vision for tech claims. A mobile app that identifies electronic components via camera and calculates physical limits to verify seller specifications.

## Tech Stack

- **Mobile**: React Native 0.76 + Expo 52, TypeScript, Zustand, SQLite, TensorFlow.js
- **Backend**: Hono on Cloudflare Workers, Supabase (PostgreSQL), Claude API
- **Monorepo**: npm workspaces with shared types package

## Project Structure

```
apps/
  mobile/src/          # 69 TypeScript files, feature-organized
    analysis/          # Claim validation & constraint chains
    ar/                # AR overlay & component markers
    camera/            # Camera capture & frame handling
    recognition/       # ML detection & OCR
    pipeline/          # Processing orchestration
    database/          # SQLite repositories
    datasheet/         # Spec retrieval & caching
    store/             # Zustand state
    ui/                # Screens & components
  backend/src/         # 16 TypeScript files
    routes/            # API endpoints (datasheet, analyze, community)
    services/          # DatasheetService, LLMService
    db/                # Database queries
packages/
  shared-types/        # TypeScript type definitions (817 lines)
docs/                  # Architecture decisions, coding guide, specs
```

## Commands

```bash
# Install & build
npm install
npm run types:build          # Build shared types first

# Mobile
npm run mobile:start         # Expo dev server
npm run mobile:ios           # iOS simulator
npm run mobile:android       # Android emulator

# Backend
npm run backend:dev          # Local Wrangler dev server
npm run backend:deploy       # Deploy to Cloudflare

# Quality
npm run test                 # Jest tests
npm run lint                 # ESLint
```

## Key Patterns

- **Feature-first organization**: Code grouped by feature, not file type
- **Types-first development**: Define types in `types.ts` before implementation
- **Module exports**: Each folder has `index.ts` exporting public API
- **File naming**: PascalCase components, camelCase utils, `use` prefix for hooks
- **State**: Zustand store persisted to AsyncStorage
- **Caching**: SQLite with 30-day TTL for datasheets

## Architecture

**8-Stage Pipeline**: Frame capture → Region detection → OCR → Component matching → Spec retrieval → AR rendering → Constraint analysis → Verdict

**Constraint Chain**: Each claim category (lumens, mAh, watts) has validators that build a chain of physical limits. The lowest limit = bottleneck = max possible value.

**Privacy-First**: Images processed on-device. Only component IDs sent to backend. No tracking.

## Configuration

- `apps/mobile/app.json` - Expo config with camera permissions
- `apps/backend/wrangler.toml` - Cloudflare Workers config
- TypeScript path aliases: `@/*` → `./src/*`, `@speccheck/shared-types`

## Environment Variables

Backend requires: `SUPABASE_URL`, `SUPABASE_KEY`, `CLAUDE_API_KEY`

## Component Categories

Detects: LEDs, LED drivers, battery cells, BMS, USB PD controllers, DC-DC converters, audio amplifiers, motor drivers, MCUs, passives

Validates claims for: lumens, mAh, Wh, watts, amps, volts

## Development Notes

- Run `npm run types:build` after modifying shared-types
- Mobile uses platform-native OCR (MLKit on Android, Vision on iOS)
- ML model is 5MB quantized MobileNetV3 + SSD
- Target: 30fps preview, <2s spec lookup, <5s LLM verdict
