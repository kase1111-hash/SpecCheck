# 10-Step Guide to Coding

A practical guide for building software, derived from the SpecCheck project architecture.

## Step 1: Define the Problem Clearly

Before writing any code, articulate what your software needs to accomplish in simple terms.

- State the core question your app answers (e.g., "Can this hardware physically do what the seller claims?")
- Identify your users and their pain points
- Define what success looks like
- List what your app is NOT (boundaries prevent scope creep)

## Step 2: Design the Data Flow

Map how information moves through your system from input to output.

```
Input → Processing → Analysis → Output
```

For SpecCheck:
```
Camera Frame → Component Detection → Spec Lookup → Constraint Chain → Verdict
```

Understand each transformation step before implementing any of them.

## Step 3: Choose Your Architecture

Select technologies based on your requirements, not trends.

Key decisions to make:
- Platform (web, mobile, desktop, cross-platform)
- Where processing happens (client, server, hybrid)
- Data storage strategy (local, cloud, both)
- Third-party dependencies

Document your rationale. "React Native because single codebase for iOS + Android" is better than "React Native because it's popular."

## Step 4: Structure Your Codebase

Organize code by domain/feature, not by file type.

```
/src
├── /camera         # Camera-related code together
├── /recognition    # Detection and matching
├── /analysis       # Business logic
├── /storage        # Data persistence
└── /ui             # User interface
```

Each module should have a clear responsibility. If you can't describe what a folder does in one sentence, split it up.

## Step 5: Define Your Data Structures

Design your types and interfaces before implementing logic.

```typescript
// Define what data looks like at each stage
CameraFrame { image, width, height, timestamp }
DetectedRegion { bbox, confidence, category }
MatchedComponent { part_number, manufacturer, specs }
Verdict { plausible | impossible | uncertain }
```

Good data structures make the code that uses them obvious.

## Step 6: Build the Pipeline Incrementally

Implement one stage at a time, end-to-end.

1. Get the simplest possible version working first
2. Add complexity only when needed
3. Test each stage independently
4. Verify data flows correctly between stages

For SpecCheck:
1. First: Camera captures a frame (just display it)
2. Then: Detect regions (draw boxes)
3. Then: Extract text (show labels)
4. Then: Match components (display specs)
5. Finally: Evaluate claims (show verdict)

## Step 7: Handle the Edges

Plan for when things don't work perfectly.

- What happens when detection fails? (Show "Partial match, manual verification suggested")
- What if the network is unavailable? (Offline mode with local cache)
- What if data is ambiguous? (Confidence scores, fallback to LLM)

Use clear status indicators:
- Green: Success
- Yellow: Partial/uncertain
- Red: Failed/impossible

## Step 8: Respect User Privacy

Design privacy into the architecture, not as an afterthought.

Principles:
- Process locally when possible
- Send only what's necessary to servers
- Never collect data you don't need
- Be transparent about what you do collect

```typescript
// What gets sent
{ part_number: "XM-L2", claim: { type: "lumens", value: 10000 } }

// What stays on device
Raw images, location, device IDs, browsing history
```

## Step 9: Set Performance Targets

Define measurable goals and work backward from them.

Example targets:
- Camera preview: 30fps
- Component detection: 15fps
- Full lookup: <2 seconds
- Cold start: <3 seconds

These targets drive decisions:
- 30fps preview → Need lightweight ML model
- <2 second lookup → Need local cache
- <3 second start → Bundle critical data with app

## Step 10: Plan Your Releases

Ship incrementally in phases, with each phase delivering value.

**Phase 1**: Core functionality (camera + detection + basic display)
**Phase 2**: Main feature (claim validation + verdict)
**Phase 3**: Polish (smooth AR, better UX)
**Phase 4**: Community (social features)
**Phase 5**: Expansion (new categories, integrations)

Each phase should be:
- Usable on its own
- Testable by real users
- A foundation for the next phase

---

## Summary

1. **Define the problem** - Know what you're building
2. **Design the data flow** - Map input to output
3. **Choose architecture** - Pick tech for reasons
4. **Structure the codebase** - Organize by feature
5. **Define data structures** - Types before logic
6. **Build incrementally** - One stage at a time
7. **Handle the edges** - Plan for failure
8. **Respect privacy** - Design it in
9. **Set performance targets** - Measure what matters
10. **Plan releases** - Ship in phases

The best code solves a real problem, flows naturally from input to output, and respects the people who use it.
