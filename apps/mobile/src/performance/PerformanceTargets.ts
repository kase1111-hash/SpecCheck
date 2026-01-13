/**
 * Performance Targets
 *
 * Defines measurable performance goals for each stage of the pipeline.
 * These targets drive architectural decisions.
 */

/**
 * Time-based performance targets (in milliseconds)
 */
export const PerformanceTargets = {
  // ═══════════════════════════════════════════════════════════════════
  // PIPELINE STAGES
  // ═══════════════════════════════════════════════════════════════════

  /** Camera preview frame rate */
  cameraPreviewFPS: {
    target: 30,
    minimum: 24,
    unit: 'fps',
  },

  /** Time to capture a frame */
  frameCapture: {
    target: 100,
    maximum: 200,
    unit: 'ms',
  },

  /** ML detection inference time */
  detectionInference: {
    target: 30,
    maximum: 50,
    unit: 'ms',
  },

  /** OCR extraction per region */
  ocrPerRegion: {
    target: 50,
    maximum: 100,
    unit: 'ms',
  },

  /** Component matching (cache hit) */
  matchingCacheHit: {
    target: 5,
    maximum: 20,
    unit: 'ms',
  },

  /** Component matching (cache miss, local fuzzy) */
  matchingFuzzy: {
    target: 50,
    maximum: 100,
    unit: 'ms',
  },

  /** Spec retrieval (cache hit) */
  specRetrievalCache: {
    target: 5,
    maximum: 20,
    unit: 'ms',
  },

  /** Spec retrieval (API call) */
  specRetrievalAPI: {
    target: 300,
    maximum: 1000,
    unit: 'ms',
  },

  /** Constraint chain building */
  constraintChain: {
    target: 20,
    maximum: 50,
    unit: 'ms',
  },

  /** Verdict generation */
  verdictGeneration: {
    target: 10,
    maximum: 30,
    unit: 'ms',
  },

  // ═══════════════════════════════════════════════════════════════════
  // END-TO-END FLOWS
  // ═══════════════════════════════════════════════════════════════════

  /** Full scan (frame → components with specs) - all cached */
  fullScanCached: {
    target: 200,
    maximum: 500,
    unit: 'ms',
  },

  /** Full scan with API calls */
  fullScanWithAPI: {
    target: 1000,
    maximum: 2000,
    unit: 'ms',
  },

  /** Full analysis with LLM */
  fullAnalysisWithLLM: {
    target: 3000,
    maximum: 5000,
    unit: 'ms',
  },

  /** Time from claim entry to verdict */
  claimToVerdict: {
    target: 100,
    maximum: 300,
    unit: 'ms',
  },

  // ═══════════════════════════════════════════════════════════════════
  // APP LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════

  /** App cold start (launch → camera ready) */
  coldStart: {
    target: 2000,
    maximum: 3000,
    unit: 'ms',
  },

  /** App warm start (resume → camera ready) */
  warmStart: {
    target: 500,
    maximum: 1000,
    unit: 'ms',
  },

  /** ML model load time */
  modelLoad: {
    target: 500,
    maximum: 1000,
    unit: 'ms',
  },

  /** Screen transition */
  screenTransition: {
    target: 100,
    maximum: 200,
    unit: 'ms',
  },

  // ═══════════════════════════════════════════════════════════════════
  // NETWORK
  // ═══════════════════════════════════════════════════════════════════

  /** API request timeout */
  apiTimeout: {
    target: 10000,
    maximum: 15000,
    unit: 'ms',
  },

  /** Time to first byte (TTFB) */
  apiTTFB: {
    target: 200,
    maximum: 500,
    unit: 'ms',
  },

} as const;

/**
 * Size-based performance targets
 */
export const SizeTargets = {
  /** ML model file size */
  mlModelSize: {
    target: 5,
    maximum: 10,
    unit: 'MB',
  },

  /** App bundle size (excluding assets) */
  appBundleSize: {
    target: 20,
    maximum: 30,
    unit: 'MB',
  },

  /** Datasheet cache maximum size */
  cacheMaxSize: {
    target: 50,
    maximum: 100,
    unit: 'MB',
  },

  /** Single scan history entry */
  scanHistoryEntry: {
    target: 10,
    maximum: 50,
    unit: 'KB',
  },

  /** API request payload */
  apiRequestSize: {
    target: 5,
    maximum: 20,
    unit: 'KB',
  },

  /** API response payload */
  apiResponseSize: {
    target: 10,
    maximum: 50,
    unit: 'KB',
  },

} as const;

/**
 * Resource usage targets
 */
export const ResourceTargets = {
  /** Memory usage during scan */
  memoryScan: {
    target: 150,
    maximum: 250,
    unit: 'MB',
  },

  /** Memory usage idle */
  memoryIdle: {
    target: 50,
    maximum: 100,
    unit: 'MB',
  },

  /** CPU usage during detection */
  cpuDetection: {
    target: 60,
    maximum: 80,
    unit: '%',
  },

  /** Battery drain per scan */
  batteryPerScan: {
    target: 0.1,
    maximum: 0.2,
    unit: '%',
  },

} as const;

/**
 * Quality targets
 */
export const QualityTargets = {
  /** Component detection accuracy */
  detectionAccuracy: {
    target: 85,
    minimum: 75,
    unit: '%',
  },

  /** OCR accuracy on chip markings */
  ocrAccuracy: {
    target: 90,
    minimum: 80,
    unit: '%',
  },

  /** Component match rate */
  matchRate: {
    target: 70,
    minimum: 50,
    unit: '%',
  },

  /** Verdict accuracy (vs expert) */
  verdictAccuracy: {
    target: 95,
    minimum: 90,
    unit: '%',
  },

  /** Cache hit rate */
  cacheHitRate: {
    target: 80,
    minimum: 60,
    unit: '%',
  },

} as const;

/**
 * Get target status
 */
export type TargetStatus = 'good' | 'acceptable' | 'poor';

export function getTargetStatus(
  value: number,
  target: { target: number; maximum?: number; minimum?: number }
): TargetStatus {
  if ('minimum' in target && target.minimum !== undefined) {
    // Higher is better (accuracy, cache hit rate)
    if (value >= target.target) return 'good';
    if (value >= target.minimum) return 'acceptable';
    return 'poor';
  } else if ('maximum' in target && target.maximum !== undefined) {
    // Lower is better (latency, size)
    if (value <= target.target) return 'good';
    if (value <= target.maximum) return 'acceptable';
    return 'poor';
  }
  return 'good';
}

/**
 * Format target for display
 */
export function formatTarget(
  name: string,
  value: number,
  target: { target: number; maximum?: number; minimum?: number; unit: string }
): string {
  const status = getTargetStatus(value, target);
  const icon = status === 'good' ? '✅' : status === 'acceptable' ? '⚠️' : '❌';
  return `${icon} ${name}: ${value}${target.unit} (target: ${target.target}${target.unit})`;
}
