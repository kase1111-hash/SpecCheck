/**
 * PrivacyPolicy
 *
 * Defines what data can go where and under what conditions.
 */

/**
 * Categories of data we handle
 */
export type DataCategory =
  | 'camera_frame'       // Raw image data
  | 'detected_region'    // Bounding boxes (no image)
  | 'ocr_text'           // Extracted text
  | 'part_number'        // Component identifiers
  | 'component_specs'    // Technical specifications
  | 'claim'              // User's claim input
  | 'verdict'            // Analysis result
  | 'scan_history'       // Past scans (local)
  | 'user_submission'    // Community submission
  | 'device_info'        // Device metadata
  | 'location'           // GPS/location data
  | 'user_id';           // User identifier

/**
 * Where data can be stored/sent
 */
export type DataDestination =
  | 'device_memory'      // RAM only, not persisted
  | 'device_storage'     // Local SQLite/files
  | 'api_datasheet'      // Datasheet lookup API
  | 'api_analyze'        // LLM analysis API
  | 'api_community'      // Community submission API
  | 'analytics'          // Analytics service (if any)
  | 'crash_reporting';   // Crash reports

/**
 * Policy for a data category
 */
export interface DataPolicy {
  /** Can this data be stored on device? */
  allowDeviceStorage: boolean;
  /** Can this data be sent to our API? */
  allowAPI: boolean;
  /** Does sending this data require explicit consent? */
  requiresConsent: boolean;
  /** How long can this data be retained? (ms, 0 = session only) */
  maxRetention: number;
  /** Must this data be anonymized before sending? */
  mustAnonymize: boolean;
  /** Human-readable explanation */
  explanation: string;
}

/**
 * Privacy policies for each data category
 */
export const PrivacyPolicy: Record<DataCategory, DataPolicy> = {
  camera_frame: {
    allowDeviceStorage: false, // Never persist raw images
    allowAPI: false,           // Never send images to server
    requiresConsent: false,    // No consent needed (never leaves device)
    maxRetention: 0,           // Session only
    mustAnonymize: false,
    explanation: 'Camera images are processed on-device and never stored or sent to servers.',
  },

  detected_region: {
    allowDeviceStorage: false,
    allowAPI: false,
    requiresConsent: false,
    maxRetention: 0,
    mustAnonymize: false,
    explanation: 'Detection regions are temporary and discarded after processing.',
  },

  ocr_text: {
    allowDeviceStorage: false,
    allowAPI: false,           // Only part numbers extracted from OCR are sent
    requiresConsent: false,
    maxRetention: 0,
    mustAnonymize: false,
    explanation: 'Raw OCR text stays on device. Only identified part numbers are used.',
  },

  part_number: {
    allowDeviceStorage: true,  // Cache lookups
    allowAPI: true,            // Needed for datasheet lookup
    requiresConsent: false,    // Part numbers are not personal data
    maxRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
    mustAnonymize: false,
    explanation: 'Part numbers are sent to look up component specifications.',
  },

  component_specs: {
    allowDeviceStorage: true,  // Cache for offline
    allowAPI: true,            // Needed for LLM analysis
    requiresConsent: false,
    maxRetention: 30 * 24 * 60 * 60 * 1000,
    mustAnonymize: false,
    explanation: 'Component specs are cached locally and may be sent for analysis.',
  },

  claim: {
    allowDeviceStorage: true,  // Scan history
    allowAPI: true,            // Needed for analysis
    requiresConsent: false,
    maxRetention: 90 * 24 * 60 * 60 * 1000, // 90 days
    mustAnonymize: false,
    explanation: 'Your claims are stored in scan history and sent for analysis.',
  },

  verdict: {
    allowDeviceStorage: true,
    allowAPI: false,           // Computed server-side, no need to send back
    requiresConsent: false,
    maxRetention: 90 * 24 * 60 * 60 * 1000,
    mustAnonymize: false,
    explanation: 'Verdicts are stored in your scan history on this device.',
  },

  scan_history: {
    allowDeviceStorage: true,
    allowAPI: false,           // Local only unless user shares
    requiresConsent: false,
    maxRetention: 365 * 24 * 60 * 60 * 1000, // 1 year
    mustAnonymize: false,
    explanation: 'Scan history is stored locally and never sent to servers.',
  },

  user_submission: {
    allowDeviceStorage: true,
    allowAPI: true,
    requiresConsent: true,     // Explicit consent required
    maxRetention: -1,          // Permanent (user controls)
    mustAnonymize: false,
    explanation: 'Community submissions are public. You choose what to share.',
  },

  device_info: {
    allowDeviceStorage: false,
    allowAPI: false,           // We don't collect device info
    requiresConsent: true,
    maxRetention: 0,
    mustAnonymize: true,
    explanation: 'We do not collect device information.',
  },

  location: {
    allowDeviceStorage: false,
    allowAPI: false,           // We never use location
    requiresConsent: true,
    maxRetention: 0,
    mustAnonymize: true,
    explanation: 'We do not access or collect location data.',
  },

  user_id: {
    allowDeviceStorage: true,  // For community features
    allowAPI: true,            // For authenticated requests
    requiresConsent: true,     // Only if user creates account
    maxRetention: -1,
    mustAnonymize: false,
    explanation: 'Account is optional. Anonymous use is fully supported.',
  },
};

/**
 * Get policy for a data category
 */
export function getDataPolicy(category: DataCategory): DataPolicy {
  return PrivacyPolicy[category];
}

/**
 * Check if data can be sent to a destination
 */
export function canSendTo(
  category: DataCategory,
  destination: DataDestination
): boolean {
  const policy = getDataPolicy(category);

  switch (destination) {
    case 'device_memory':
      return true; // Always allowed in memory
    case 'device_storage':
      return policy.allowDeviceStorage;
    case 'api_datasheet':
    case 'api_analyze':
    case 'api_community':
      return policy.allowAPI;
    case 'analytics':
    case 'crash_reporting':
      return false; // We don't use these
    default:
      return false;
  }
}

/**
 * Get human-readable privacy summary
 */
export function getPrivacySummary(): string[] {
  return [
    '📷 Images are processed on your device and never uploaded',
    '🔒 Only component part numbers are sent to look up specs',
    '📍 We never access your location',
    '🆔 No account required - use anonymously',
    '🗑️ You can delete all your data anytime',
    '📤 Community submissions are optional and you control what you share',
  ];
}
