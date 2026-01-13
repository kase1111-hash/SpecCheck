# SpecCheck - Privacy Architecture

## Core Principles

1. **Images never leave the device**
2. **Only part numbers are sent to servers**
3. **No tracking, no fingerprinting**
4. **User controls all their data**
5. **Anonymous use is fully supported**

---

## Data Flow: What Stays, What Goes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ON DEVICE (Always)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   📷 Camera Frame ──► 🔍 Detection ──► 📝 OCR ──► 🏷️ Part Number        │
│         │                  │              │              │               │
│         ▼                  ▼              ▼              ▼               │
│     [DELETED]          [DELETED]      [DELETED]    [SENT IF NEEDED]     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           TO SERVER (Minimal)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Request: { partNumber: "XM-L2" }                                      │
│                                                                          │
│   Response: { specs: { lumens: 1052, ... } }                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Categories

| Category | Stored on Device | Sent to Server | User Consent Required |
|----------|------------------|----------------|----------------------|
| Camera frames | ❌ Never | ❌ Never | No |
| Detection regions | ❌ Never | ❌ Never | No |
| Raw OCR text | ❌ Never | ❌ Never | No |
| Part numbers | ✅ Cache | ✅ For lookup | No |
| Component specs | ✅ Cache | ✅ For analysis | No |
| Claims | ✅ History | ✅ For analysis | No |
| Verdicts | ✅ History | ❌ Never | No |
| Community submissions | ✅ Draft | ✅ If submitted | **Yes** |
| Device info | ❌ Never | ❌ Never | N/A |
| Location | ❌ Never | ❌ Never | N/A |
| User ID | ✅ If account | ✅ If account | **Yes** |

---

## What We Send to Servers

### Datasheet Lookup

```typescript
// REQUEST
{
  partNumber: "XM-L2"
}

// RESPONSE
{
  partNumber: "XM-L2",
  manufacturer: "Cree",
  specs: { luminous_flux: 1052, ... }
}
```

**We send:** Part number only
**We receive:** Public datasheet information

### Claim Analysis (LLM)

```typescript
// REQUEST
{
  claim: {
    category: "lumens",
    value: 10000,
    unit: "lm"
  },
  components: [
    {
      partNumber: "XM-L2",
      manufacturer: "Cree",
      category: "led",
      specs: { luminous_flux: { value: 1052, unit: "lm" } }
    }
  ]
}

// RESPONSE
{
  verdict: "impossible",
  maxPossible: 1052,
  reasoning: "..."
}
```

**We send:** Claim + component specs (no images, no identifiers)
**We receive:** Analysis result

### Community Submission (User-Initiated)

```typescript
// Only sent when user explicitly submits
{
  productName: "Example Flashlight",
  listingUrl: "https://...",        // User provides
  claimedSpecs: { lumens: "10000" },
  actualSpecs: { lumens: "1052" },
  verdict: "impossible",
  images: [...],                     // User uploads voluntarily
  componentList: [...]
}
```

**Requires:** Explicit user consent
**User controls:** What to share, can delete later

---

## What We NEVER Send

| Data Type | Why We Don't Send It |
|-----------|---------------------|
| Raw camera images | Privacy risk, not needed for analysis |
| Device ID | No tracking |
| IMEI/MEID | No device fingerprinting |
| Location | Not relevant to analysis |
| IP address | Logged minimally by CDN, not stored |
| Browsing history | Not collected |
| Other app data | Not accessed |
| Contacts | Not accessed |
| Calendar | Not accessed |

---

## Data Retention

| Data Type | Retention | User Control |
|-----------|-----------|--------------|
| Camera frames | Session only (RAM) | Automatic |
| Datasheet cache | 30 days | Can clear anytime |
| Scan history | 1 year | Can delete anytime |
| Saved products | Until deleted | Full control |
| Community submissions | Permanent | Can delete |
| Account | Until deleted | Can delete |

---

## User Data Controls

### Export Your Data

Users can export all their data as JSON:

```typescript
const data = await userDataManager.exportAsJSON();
// Returns complete export of all stored data
```

### Delete Your Data

Users can delete data selectively or completely:

```typescript
// Delete specific data
await userDataManager.deleteData({
  scanHistory: true,
  savedProducts: false,
  cache: true,
  preferences: false,
  consents: false,
  everything: false,
});

// Delete everything
await userDataManager.deleteData({ everything: true });
```

### Data Summary

Users can see what data is stored:

```typescript
const summary = await userDataManager.getDataSummary();
// {
//   scanCount: 42,
//   savedCount: 5,
//   cacheSize: "12 MB",
//   oldestScan: 1699123456789
// }
```

---

## Consent Management

### When Consent Is Required

| Action | Consent Type | Required |
|--------|--------------|----------|
| Scanning components | None | ❌ |
| Looking up datasheets | None | ❌ |
| Analyzing claims | None | ❌ |
| Viewing community | None | ❌ |
| **Submitting to community** | `community_submission` | ✅ |
| **Creating account** | `account_creation` | ✅ |

### Consent Flow

1. User initiates action requiring consent
2. Consent dialog explains what data will be shared
3. User explicitly grants or denies
4. Consent is recorded with timestamp and policy version
5. User can revoke anytime in Settings

---

## Privacy Guards

### Runtime Validation

Before any API call, data is validated:

```typescript
// This throws if image data is present
PrivacyGuard.validateForAPI(data, 'component_specs', 'analyze');

// This strips sensitive fields
const safeData = sanitizeForAnalyzeAPI(claim, components);

// This checks for accidentally included images
assertNoImageData(requestBody);
```

### Sanitization

Data is sanitized before sending:

```typescript
// Input
{
  regionId: "r_123",
  imageBase64: "data:image/jpeg;base64,/9j/4AAQ...", // 500KB
  partNumber: "XM-L2",
  confidence: 0.95
}

// Sanitized output
{
  partNumber: "XM-L2"
}
```

### Logging

Logs are sanitized to prevent accidental exposure:

```typescript
// Raw log data
{ imageBase64: "data:image/...", userId: "user_123", partNumber: "XM-L2" }

// Sanitized for logging
{ imageBase64: "[REDACTED]", userId: "[REDACTED]", partNumber: "XM-L2" }
```

---

## Anonymous Use

SpecCheck fully supports anonymous use:

| Feature | Anonymous | With Account |
|---------|-----------|--------------|
| Scan components | ✅ | ✅ |
| Look up datasheets | ✅ | ✅ |
| Analyze claims | ✅ | ✅ |
| View scan history | ✅ (local) | ✅ (local) |
| Search community | ✅ | ✅ |
| Submit to community | ❌ | ✅ |
| Earn reputation | ❌ | ✅ |

---

## Offline Privacy

When offline, privacy is even stronger:

- ✅ All processing on device
- ✅ No network requests at all
- ✅ Bundled data only
- ❌ Cannot look up unknown components

---

## Third Parties

### Services We Use

| Service | What We Send | Why |
|---------|--------------|-----|
| Cloudflare Workers | API requests | Hosting |
| Supabase | Part numbers, community data | Database |
| Anthropic Claude | Specs + claims (no images) | Analysis |

### Services We DON'T Use

- ❌ Google Analytics
- ❌ Facebook SDK
- ❌ Ad networks
- ❌ Crash reporting with PII
- ❌ A/B testing services

---

## Implementation Checklist

- [x] Camera frames never stored
- [x] Images never sent to server
- [x] No device fingerprinting
- [x] No location access
- [x] Consent required for submissions
- [x] Data export available
- [x] Data deletion available
- [x] Sanitization before API calls
- [x] Privacy guards at runtime
- [x] Logs are redacted

---

## Privacy Summary for Users

```
📷 Your photos stay on your device
🔒 We only send component part numbers
📍 We never access your location
🆔 No account required
🗑️ Delete your data anytime
📤 Export your data anytime
🕵️ No tracking or ads
```
