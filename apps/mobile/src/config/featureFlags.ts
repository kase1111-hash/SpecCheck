/**
 * Feature Flags
 *
 * Control feature rollout and A/B testing.
 * Flags can be overridden by remote config.
 */

import { Version } from './version';

/**
 * Feature flag definitions
 */
export interface FeatureFlags {
  // ═══════════════════════════════════════════════════════════════════
  // Phase 1: Core Recognition (MVP)
  // ═══════════════════════════════════════════════════════════════════

  /** Enable camera and detection */
  coreDetection: boolean;

  /** Enable OCR text extraction */
  ocrExtraction: boolean;

  /** Enable component matching */
  componentMatching: boolean;

  /** Enable basic AR overlay */
  basicOverlay: boolean;

  // ═══════════════════════════════════════════════════════════════════
  // Phase 2: Claim Validation
  // ═══════════════════════════════════════════════════════════════════

  /** Enable spec lookup from API */
  apiSpecLookup: boolean;

  /** Enable claim input UI */
  claimInput: boolean;

  /** Enable constraint chain analysis */
  constraintAnalysis: boolean;

  /** Enable verdict display */
  verdictDisplay: boolean;

  // ═══════════════════════════════════════════════════════════════════
  // Phase 3: Full AR Experience
  // ═══════════════════════════════════════════════════════════════════

  /** Enable expandable spec cards */
  specCards: boolean;

  /** Enable visual constraint chain */
  constraintChainOverlay: boolean;

  /** Enable gesture controls (pinch, pan) */
  gestureControls: boolean;

  /** Enable sharing */
  shareVerdict: boolean;

  // ═══════════════════════════════════════════════════════════════════
  // Phase 4: Community Layer
  // ═══════════════════════════════════════════════════════════════════

  /** Enable community search */
  communitySearch: boolean;

  /** Enable community submissions */
  communitySubmit: boolean;

  /** Enable user accounts */
  userAccounts: boolean;

  /** Enable reputation system */
  reputationSystem: boolean;

  // ═══════════════════════════════════════════════════════════════════
  // Phase 5: Expansion
  // ═══════════════════════════════════════════════════════════════════

  /** Enable barcode scanning */
  barcodeScanning: boolean;

  /** Enable additional categories */
  additionalCategories: boolean;

  /** Enable public API */
  publicAPI: boolean;

  // ═══════════════════════════════════════════════════════════════════
  // Development/Debug
  // ═══════════════════════════════════════════════════════════════════

  /** Show debug overlay */
  debugOverlay: boolean;

  /** Enable performance monitoring */
  performanceMonitoring: boolean;

  /** Enable verbose logging */
  verboseLogging: boolean;
}

/**
 * Default flag values based on current phase
 */
function getDefaultFlags(): FeatureFlags {
  const phase = Version.phase;

  return {
    // Phase 1 - enabled in phase 1+
    coreDetection: phase >= 1,
    ocrExtraction: phase >= 1,
    componentMatching: phase >= 1,
    basicOverlay: phase >= 1,

    // Phase 2 - enabled in phase 2+
    apiSpecLookup: phase >= 2,
    claimInput: phase >= 2,
    constraintAnalysis: phase >= 2,
    verdictDisplay: phase >= 2,

    // Phase 3 - enabled in phase 3+
    specCards: phase >= 3,
    constraintChainOverlay: phase >= 3,
    gestureControls: phase >= 3,
    shareVerdict: phase >= 3,

    // Phase 4 - enabled in phase 4+
    communitySearch: phase >= 4,
    communitySubmit: phase >= 4,
    userAccounts: phase >= 4,
    reputationSystem: phase >= 4,

    // Phase 5 - enabled in phase 5+
    barcodeScanning: phase >= 5,
    additionalCategories: phase >= 5,
    publicAPI: phase >= 5,

    // Debug - only in development
    debugOverlay: __DEV__,
    performanceMonitoring: __DEV__,
    verboseLogging: __DEV__,
  };
}

/**
 * Current feature flags (can be overridden)
 */
let currentFlags: FeatureFlags = getDefaultFlags();

/**
 * Remote overrides (from server)
 */
let remoteOverrides: Partial<FeatureFlags> = {};

/**
 * Get current feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  return { ...currentFlags, ...remoteOverrides };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[flag];
}

/**
 * Override a flag locally (for testing)
 */
export function overrideFlag(flag: keyof FeatureFlags, value: boolean): void {
  currentFlags = { ...currentFlags, [flag]: value };
}

/**
 * Apply remote overrides (from config server)
 */
export function applyRemoteOverrides(overrides: Partial<FeatureFlags>): void {
  remoteOverrides = overrides;
}

/**
 * Reset flags to defaults
 */
export function resetFlags(): void {
  currentFlags = getDefaultFlags();
  remoteOverrides = {};
}

/**
 * Get flags for current phase
 */
export function getPhaseFlags(phase: number): Partial<FeatureFlags> {
  return {
    coreDetection: phase >= 1,
    ocrExtraction: phase >= 1,
    componentMatching: phase >= 1,
    basicOverlay: phase >= 1,
    apiSpecLookup: phase >= 2,
    claimInput: phase >= 2,
    constraintAnalysis: phase >= 2,
    verdictDisplay: phase >= 2,
    specCards: phase >= 3,
    constraintChainOverlay: phase >= 3,
    gestureControls: phase >= 3,
    shareVerdict: phase >= 3,
    communitySearch: phase >= 4,
    communitySubmit: phase >= 4,
    userAccounts: phase >= 4,
    reputationSystem: phase >= 4,
    barcodeScanning: phase >= 5,
    additionalCategories: phase >= 5,
    publicAPI: phase >= 5,
  };
}

/**
 * Development mode flag
 */
declare const __DEV__: boolean;
