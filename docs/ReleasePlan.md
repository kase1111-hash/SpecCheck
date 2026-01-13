# SpecCheck - Release Plan

## Philosophy

Ship incrementally. Each phase delivers standalone value and builds foundation for the next.

```
Phase 1: See      → "What components are in here?"
Phase 2: Verify   → "Can this do what it claims?"
Phase 3: Explore  → "Show me the details"
Phase 4: Share    → "Has anyone else checked this?"
Phase 5: Expand   → "What else can it do?"
```

---

## Phase 1: Core Recognition (MVP)

**Goal**: Point camera at PCB, see identified components

### Features

- [x] Camera integration with live preview
- [x] On-device ML component detection
- [x] Bounding box overlay on detected components
- [x] Basic OCR for chip markings
- [x] Component matching against bundled database
- [x] Tap component to see part number + manufacturer

### User Story

> "I open the app, point at a circuit board, and see boxes around components with their part numbers."

### Success Criteria

- [ ] Detection works on 3+ test devices
- [ ] 70%+ detection accuracy on test images
- [ ] < 500ms from frame to overlay
- [ ] Works offline with bundled data

### Technical Scope

```
✅ CameraView with preview
✅ ComponentDetector with ML model
✅ OCREngine with platform OCR
✅ ComponentMatcher with bundled patterns
✅ Basic AR overlay (boxes + labels)
✅ Offline component database (50+ common parts)
```

### Not in Phase 1

- ❌ Spec lookup (just part numbers)
- ❌ Claim validation
- ❌ Detailed spec cards
- ❌ History/saved items
- ❌ Community features

### Release: v0.1.0

---

## Phase 2: Claim Validation

**Goal**: Enter a claim, get a verdict

### Features

- [ ] Spec retrieval from API (with caching)
- [ ] Claim input UI (natural language parsing)
- [ ] Constraint chain analysis
- [ ] Verdict display (plausible/impossible)
- [ ] Basic explanation of verdict

### User Story

> "I scan a flashlight, type '10,000 lumens', and the app tells me that's impossible because the LED maxes at 1,052 lumens."

### Success Criteria

- [ ] Verdicts match expert analysis 90%+ of the time
- [ ] Claim entry accepts common formats (10k, 10,000, 10000 lm)
- [ ] API response < 1 second
- [ ] Clear explanation of bottleneck

### Technical Scope

```
✅ DatasheetAPI with caching
✅ ClaimParser for natural language
✅ ConstraintChainBuilder for flashlight/powerbank/charger
✅ VerdictGenerator with explanations
✅ Verdict UI (color-coded, animated)
✅ Backend datasheet service (Cloudflare Workers)
```

### Dependencies

- Requires datasheet database population
- Requires backend deployment

### Release: v0.2.0

---

## Phase 3: Full AR Experience

**Goal**: Rich, interactive component exploration

### Features

- [ ] Expandable spec cards on tap
- [ ] Visual constraint chain overlay
- [ ] Pinch-to-zoom with overlay persistence
- [ ] Smooth anchor tracking
- [ ] Component comparison view
- [ ] Share verdict as image

### User Story

> "I tap an LED and see a floating card with all its specs. I can see visually how each component limits the output."

### Success Criteria

- [ ] Spec cards render without jank
- [ ] Overlays track with camera movement
- [ ] Constraint chain is visually clear
- [ ] Sharing works on iOS and Android

### Technical Scope

```
□ SpecCard component with animations
□ ConstraintChainOverlay visualization
□ Improved anchor tracking (feature points)
□ Gesture handling (pinch, pan)
□ Share sheet integration
□ Smooth 60fps animations
```

### Release: v0.3.0

---

## Phase 4: Community Layer

**Goal**: Search and share verifications

### Features

- [ ] Search existing verifications by product/URL
- [ ] Submit new verification
- [ ] Reputation system for contributors
- [ ] Moderation tools (flagging, review queue)
- [ ] Account creation (optional)

### User Story

> "Before buying, I search for 'cheap flashlight amazon' and find someone already opened one up - it's only 800 lumens, not 10,000."

### Success Criteria

- [ ] Search returns relevant results
- [ ] Submission flow < 2 minutes
- [ ] No account required to search
- [ ] Spam/abuse is manageable

### Technical Scope

```
□ CommunityAPI integration
□ SearchView with filters
□ SubmissionForm with image upload
□ ReputationBadge component
□ Report/flag flow
□ Backend moderation tools
```

### Dependencies

- Requires community database
- Requires image storage (R2)
- Requires moderation policy

### Release: v0.4.0

---

## Phase 5: Expansion

**Goal**: More categories, more integrations

### Features

- [ ] Additional categories (audio, motors, storage)
- [ ] Barcode/QR scanning for product lookup
- [ ] Browser extension for shopping sites
- [ ] Export/share detailed reports
- [ ] API for third-party integrations

### User Story

> "I scan the barcode on a speaker box and instantly see that the '500W' claim is actually 20W RMS."

### Success Criteria

- [ ] 5+ product categories supported
- [ ] Barcode lookup < 2 seconds
- [ ] Browser extension works on Amazon/eBay
- [ ] API has documentation and rate limits

### Technical Scope

```
□ CategoryRules for audio, motor, storage
□ BarcodeScanner integration
□ Browser extension (Chrome/Firefox)
□ PDF report generation
□ Public API with auth
```

### Release: v1.0.0

---

## Version Numbering

```
v0.1.0  Phase 1: Core Recognition (MVP)
v0.2.0  Phase 2: Claim Validation
v0.3.0  Phase 3: Full AR Experience
v0.4.0  Phase 4: Community Layer
v1.0.0  Phase 5: Expansion (full release)

Patch versions (v0.1.1) for bug fixes
Minor versions for phases
Major version 1.0 = feature complete
```

---

## Release Checklist Template

### Pre-Release

- [ ] All phase features implemented
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Performance targets met
- [ ] No critical bugs in backlog
- [ ] Documentation updated
- [ ] Changelog written

### Testing

- [ ] Tested on iOS (3+ device types)
- [ ] Tested on Android (3+ device types)
- [ ] Tested offline mode
- [ ] Tested low-end device
- [ ] Tested with real PCB images
- [ ] QA sign-off

### Deployment

- [ ] Version number bumped
- [ ] Build created for both platforms
- [ ] Backend deployed (if changes)
- [ ] Database migrated (if changes)
- [ ] Feature flags configured
- [ ] Monitoring enabled

### Post-Release

- [ ] App store submission (iOS)
- [ ] Play store submission (Android)
- [ ] Release notes published
- [ ] Social media announcement
- [ ] Monitor crash reports
- [ ] Monitor performance metrics

---

## Feature Flags

Control feature rollout with flags:

```typescript
const FeatureFlags = {
  // Phase 2
  claimValidation: false,
  apiSpecLookup: false,

  // Phase 3
  specCards: false,
  constraintChainOverlay: false,
  gestureControls: false,

  // Phase 4
  communitySearch: false,
  communitySubmit: false,

  // Phase 5
  barcodeScanning: false,
  additionalCategories: false,
};
```

Enable gradually:
1. Internal testing (all flags on)
2. Beta users (flags on for beta)
3. 10% rollout
4. 50% rollout
5. 100% (flag removed)

---

## Rollback Plan

If critical issues found:

1. **Immediate**: Disable feature flag (if applicable)
2. **Within 1 hour**: Push hotfix if simple
3. **Within 24 hours**: Roll back to previous version
4. **Post-mortem**: Document what happened

### App Store Rollback

- iOS: Use "Remove from Sale" then resubmit previous
- Android: Use "Halt rollout" then staged rollout of previous

---

## Timeline Estimates

No specific dates, but relative effort:

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 | ██████░░░░ 60% done | ML model training |
| Phase 2 | ████░░░░░░ | Backend deployment, datasheet DB |
| Phase 3 | ███░░░░░░░ | Phase 2 complete |
| Phase 4 | ████░░░░░░ | Moderation policy, community guidelines |
| Phase 5 | █████░░░░░ | Phase 4 complete, category research |

---

## Metrics Per Phase

### Phase 1 Metrics

- Daily active users
- Scans per user
- Detection success rate
- Crash rate

### Phase 2 Metrics

- Claims validated per day
- Verdict accuracy (user feedback)
- API cache hit rate
- Time to verdict

### Phase 3 Metrics

- Spec cards opened per scan
- Average session duration
- Shares per verdict
- Animation frame rate

### Phase 4 Metrics

- Community searches per day
- Submissions per day
- Spam rate
- User retention

### Phase 5 Metrics

- Categories used distribution
- Barcode scan success rate
- API usage
- Third-party integrations

---

## Summary

| Phase | Delivers | Release |
|-------|----------|---------|
| **1** | "What's in here?" | v0.1.0 |
| **2** | "Can it do that?" | v0.2.0 |
| **3** | "Tell me everything" | v0.3.0 |
| **4** | "What did others find?" | v0.4.0 |
| **5** | "Do it all" | v1.0.0 |

Each phase is usable alone. Each phase builds on the last.
