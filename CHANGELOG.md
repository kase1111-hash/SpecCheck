# Changelog

All notable changes to SpecCheck will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project documentation (10-step coding guide)
- Problem definition and data flow design
- Architecture decisions documentation
- Codebase structure (mobile app + backend)
- Comprehensive type definitions
- Pipeline implementation (8 stages)
- Error handling and offline mode
- Privacy-by-design architecture
- Performance targets and monitoring
- Release planning and feature flags

---

## [0.1.0] - TBD

### Phase 1: Core Recognition (MVP)

#### Added
- Camera integration with live preview
- On-device ML component detection (MobileNetV3 + SSD)
- OCR text extraction using platform APIs (MLKit/Vision)
- Component matching against bundled database
- Basic AR overlay with bounding boxes and labels
- Offline support with bundled component data
- Privacy-first architecture (images never leave device)

#### Technical
- React Native + Expo framework
- TensorFlow Lite / Core ML for inference
- SQLite for local caching
- Zustand for state management

---

## [0.2.0] - Planned

### Phase 2: Claim Validation

#### Added
- Spec retrieval from backend API
- Local caching with 30-day TTL
- Natural language claim parsing ("10k lumens", "10,000 mAh")
- Constraint chain analysis for flashlights, power banks, chargers
- Verdict display (plausible/impossible/uncertain)
- Human-readable explanations with bottleneck identification

#### Technical
- Cloudflare Workers backend
- Supabase PostgreSQL database
- Claude API for complex reasoning

---

## [0.3.0] - Planned

### Phase 3: Full AR Experience

#### Added
- Expandable spec cards with full component details
- Visual constraint chain overlay
- Pinch-to-zoom with overlay persistence
- Improved anchor tracking
- Share verdict as image
- Component comparison view

---

## [0.4.0] - Planned

### Phase 4: Community Layer

#### Added
- Search existing verifications by product name or URL
- Submit new verifications with photos
- Optional user accounts
- Reputation system for contributors
- Moderation tools (flagging, review queue)

---

## [1.0.0] - Planned

### Phase 5: Full Release

#### Added
- Additional categories (audio, motors, storage devices)
- Barcode/QR scanning for product lookup
- Browser extension for shopping sites
- PDF report generation
- Public API with documentation

---

## Version Guide

- **0.x.0**: Development releases (phases 1-4)
- **1.0.0**: First stable release (phase 5 complete)
- **x.x.1**: Bug fixes and patches
- **Beta**: Pre-release versions for testing

## Links

- [Release Plan](docs/ReleasePlan.md)
- [Architecture](Architecture.md)
- [Privacy Policy](docs/Privacy.md)
