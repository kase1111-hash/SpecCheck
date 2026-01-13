/**
 * SpecCheck Shared Types
 *
 * Comprehensive type definitions for the entire application.
 * Import from '@speccheck/shared-types'
 *
 * Organization:
 * 1. Core Domain Types (components, specs)
 * 2. Pipeline Stage Types (camera → detection → OCR → matching → specs)
 * 3. Analysis Types (claims, constraints, verdicts)
 * 4. API Types (requests, responses)
 * 5. Storage Types (cache, history)
 * 6. UI State Types
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. CORE DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Categories of electronic components we can identify
 */
export type ComponentCategory =
  | 'led'              // LED packages (Cree, Lumileds, etc.)
  | 'led_driver'       // LED driver ICs
  | 'battery_cell'     // Li-ion cells (18650, 21700, pouch)
  | 'bms'              // Battery management systems
  | 'usb_pd'           // USB Power Delivery controllers
  | 'dc_dc'            // DC-DC converters
  | 'audio_amp'        // Audio amplifier ICs
  | 'motor_driver'     // Motor driver ICs
  | 'mcu'              // Microcontrollers
  | 'capacitor'        // Electrolytic/ceramic capacitors
  | 'inductor'         // Inductors and chokes
  | 'resistor'         // Resistors (usually not identified)
  | 'connector'        // USB, barrel jack, headers
  | 'ic_generic'       // Unclassified ICs
  | 'unknown';         // Could not categorize

/**
 * A single specification value from a datasheet
 */
export interface SpecValue {
  /** Primary numeric value */
  value: number;
  /** Unit of measurement (lm, mA, V, W, etc.) */
  unit: string;
  /** Test conditions (e.g., "at 25°C", "Tj=85°C") */
  conditions: string | null;
  /** Minimum value (for ranges) */
  min: number | null;
  /** Maximum value (for ranges) */
  max: number | null;
  /** Typical value (if different from value) */
  typical: number | null;
}

/**
 * Helper to create a simple SpecValue
 */
export function specValue(value: number, unit: string): SpecValue {
  return { value, unit, conditions: null, min: null, max: null, typical: null };
}

/**
 * Complete specifications for a component
 */
export interface ComponentSpecs {
  /** Manufacturer part number */
  partNumber: string;
  /** Manufacturer name */
  manufacturer: string;
  /** Component category */
  category: ComponentCategory;
  /** Where this data came from */
  source: DataSource;
  /** Key-value specifications */
  specs: Record<string, SpecValue>;
  /** URL to original datasheet PDF */
  datasheetUrl: string | null;
  /** When this data was last verified */
  lastUpdated: number;
}

export type DataSource = 'cache' | 'api' | 'llm' | 'manual';

// ═══════════════════════════════════════════════════════════════════════════
// 2. PIPELINE STAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Stage 1: Camera Frame
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single frame captured from the camera
 */
export interface CameraFrame {
  /** Unique frame identifier */
  id: string;
  /** Image data as base64 string */
  imageBase64: string;
  /** Frame width in pixels */
  width: number;
  /** Frame height in pixels */
  height: number;
  /** Capture timestamp (ms since epoch) */
  timestamp: number;
  /** Device orientation (0, 90, 180, 270) */
  orientation: Orientation;
  /** Is this a full-resolution capture (vs preview frame) */
  isFullResolution: boolean;
}

export type Orientation = 0 | 90 | 180 | 270;

/**
 * Camera configuration options
 */
export interface CameraConfig {
  /** Preview stream resolution */
  previewResolution: Resolution;
  /** Capture resolution (for tap-to-capture) */
  captureResolution: Resolution;
  /** Torch/flashlight enabled */
  torchEnabled: boolean;
  /** Camera facing direction */
  facing: CameraFacing;
  /** Auto-focus mode */
  autoFocus: boolean;
}

export type Resolution = 'low' | 'medium' | 'high' | 'max';
export type CameraFacing = 'front' | 'back';

// ─────────────────────────────────────────────────────────────────────────────
// Stage 2: Region Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bounding box coordinates
 */
export interface BoundingBox {
  /** X coordinate (pixels from left) */
  x: number;
  /** Y coordinate (pixels from top) */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * A detected region in the camera frame
 */
export interface DetectedRegion {
  /** Unique region identifier */
  regionId: string;
  /** Reference to source frame */
  frameId: string;
  /** Bounding box in image coordinates */
  bbox: BoundingBox;
  /** Detection confidence (0.0 - 1.0) */
  confidence: number;
  /** Predicted component category */
  category: ComponentCategory;
  /** Detection timestamp */
  detectedAt: number;
}

/**
 * Result of running detection on a frame
 */
export interface DetectionResult {
  /** Source frame ID */
  frameId: string;
  /** All detected regions */
  regions: DetectedRegion[];
  /** Processing time in ms */
  processingTimeMs: number;
  /** Model version used */
  modelVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 3: OCR Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Text extracted from a detected region
 */
export interface ExtractedText {
  /** Reference to region */
  regionId: string;
  /** Raw OCR output lines */
  rawLines: string[];
  /** Cleaned and normalized text */
  cleanedText: string;
  /** OCR confidence (0.0 - 1.0) */
  confidence: number;
  /** Individual word extractions with positions */
  words: OCRWord[];
}

/**
 * A single word from OCR with position
 */
export interface OCRWord {
  /** The text content */
  text: string;
  /** Confidence for this word */
  confidence: number;
  /** Bounding box within the region */
  bbox: BoundingBox;
}

/**
 * Result of OCR processing on detected regions
 */
export interface OCRResult {
  /** Source frame ID */
  frameId: string;
  /** Extracted text per region */
  extractions: ExtractedText[];
  /** Processing time in ms */
  processingTimeMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 4: Component Matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Match status indicating confidence level
 */
export type MatchStatus =
  | 'confident'   // High confidence single match
  | 'partial'     // Multiple candidates or moderate confidence
  | 'unknown';    // No match found

/**
 * A matched component from text extraction
 */
export interface MatchedComponent {
  /** Reference to region */
  regionId: string;
  /** Match status */
  status: MatchStatus;
  /** Identified part number (if matched) */
  partNumber: string | null;
  /** Manufacturer (if identified) */
  manufacturer: string | null;
  /** Category (from detection or refined by match) */
  category: ComponentCategory;
  /** Match confidence (0.0 - 1.0) */
  confidence: number;
  /** Datasheet ID for spec lookup */
  datasheetId: string | null;
  /** Alternative candidates if partial match */
  alternatives: MatchCandidate[];
}

/**
 * A potential match candidate
 */
export interface MatchCandidate {
  partNumber: string;
  manufacturer: string;
  confidence: number;
  datasheetId: string;
}

/**
 * Result of component matching
 */
export interface MatchResult {
  /** Source frame ID */
  frameId: string;
  /** Matched components */
  components: MatchedComponent[];
  /** Components successfully matched */
  matchedCount: number;
  /** Components with partial matches */
  partialCount: number;
  /** Components with no match */
  unknownCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 5: Spec Retrieval
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full component with retrieved specifications
 */
export interface ComponentWithSpecs {
  /** The matched component info */
  match: MatchedComponent;
  /** Full specifications (null if not retrievable) */
  specs: ComponentSpecs | null;
  /** Error if retrieval failed */
  error: string | null;
}

/**
 * Result of spec retrieval for all components
 */
export interface SpecRetrievalResult {
  /** Source frame ID */
  frameId: string;
  /** Components with their specs */
  components: ComponentWithSpecs[];
  /** How many specs came from cache */
  cacheHits: number;
  /** How many required API calls */
  apiCalls: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ANALYSIS TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Categories of claims we can validate
 */
export type ClaimCategory =
  | 'lumens'      // Light output (flashlights)
  | 'mah'         // Battery capacity (power banks)
  | 'wh'          // Energy capacity (power banks)
  | 'watts'       // Power output (chargers, speakers)
  | 'amps'        // Current output (chargers)
  | 'volts';      // Voltage output

/**
 * A claim to be validated
 */
export interface Claim {
  /** Type of claim */
  category: ClaimCategory;
  /** Claimed numeric value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Where the claim came from */
  source: ClaimSource;
  /** Original text (for display) */
  originalText: string;
}

export type ClaimSource =
  | 'user_input'      // User typed it in
  | 'listing_ocr'     // Extracted from product listing
  | 'packaging_ocr';  // Extracted from packaging

/**
 * A single link in the constraint chain
 */
export interface ChainLink {
  /** Component this link represents */
  component: ComponentWithSpecs;
  /** Type of constraint (max_current, max_power, etc.) */
  constraintType: ConstraintType;
  /** The limiting value */
  maxValue: number;
  /** Unit for the max value */
  unit: string;
  /** Is this the bottleneck? */
  isBottleneck: boolean;
  /** Human-readable explanation */
  explanation: string;
  /** Spec key this was derived from */
  sourceSpec: string;
}

export type ConstraintType =
  | 'max_output'       // Direct output limit (lumens, watts)
  | 'max_current'      // Current limit
  | 'max_discharge'    // Battery discharge limit
  | 'thermal_limit'    // Heat dissipation limit
  | 'efficiency'       // Conversion efficiency
  | 'voltage_limit';   // Voltage constraint

/**
 * Complete constraint chain analysis
 */
export interface ConstraintChain {
  /** The claim being evaluated */
  claim: Claim;
  /** Links in the chain (ordered) */
  links: ChainLink[];
  /** The bottleneck link (lowest limit) */
  bottleneck: ChainLink | null;
  /** Maximum possible output */
  maxPossible: number;
  /** Unit for max possible */
  unit: string;
  /** Overall verdict */
  verdict: VerdictResult;
  /** Confidence in the analysis */
  confidence: VerdictConfidence;
}

/**
 * Verdict result
 */
export type VerdictResult =
  | 'plausible'    // Claim is physically possible
  | 'impossible'   // Claim exceeds physical limits
  | 'uncertain';   // Not enough info to decide

/**
 * Confidence level in the verdict
 */
export type VerdictConfidence =
  | 'high'     // All components identified, clear analysis
  | 'medium'   // Some components partially matched
  | 'low';     // Key components missing

/**
 * Final verdict for display
 */
export interface Verdict {
  /** The result */
  result: VerdictResult;
  /** Confidence level */
  confidence: VerdictConfidence;
  /** Claimed value */
  claimed: number;
  /** Maximum possible value */
  maxPossible: number;
  /** Unit */
  unit: string;
  /** Bottleneck component (if applicable) */
  bottleneck: string | null;
  /** Main explanation */
  explanation: string;
  /** Detailed breakdown */
  details: string[];
  /** Timestamp of analysis */
  analyzedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. API TYPES
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Datasheet API
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/datasheet/:partNumber */
export interface DatasheetResponse {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  specs: Record<string, SpecValue>;
  datasheetUrl: string | null;
  lastUpdated: number;
}

/** POST /api/datasheet/search */
export interface DatasheetSearchRequest {
  query: string;
  category?: ComponentCategory;
  manufacturer?: string;
  limit?: number;
}

export interface DatasheetSearchResponse {
  matches: DatasheetSummary[];
  totalCount: number;
}

export interface DatasheetSummary {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  description: string;
}

/** POST /api/datasheet/identify */
export interface IdentifyRequest {
  textLines: string[];
  categoryHint?: ComponentCategory;
}

export interface IdentifyResponse {
  matches: IdentifyMatch[];
  confidence: number;
}

export interface IdentifyMatch {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  confidence: number;
  datasheetId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analyze API
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/analyze/claim */
export interface AnalyzeRequest {
  claim: Claim;
  components: ComponentSpecs[];
  productCategory: string;
}

export interface AnalyzeResponse {
  verdict: VerdictResult;
  confidence: VerdictConfidence;
  maxPossible: number;
  unit: string;
  reasoning: string;
  chain: AnalyzeChainLink[];
}

export interface AnalyzeChainLink {
  componentPartNumber: string;
  constraintType: ConstraintType;
  maxValue: number;
  unit: string;
  isBottleneck: boolean;
  explanation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Community API
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/community/submit */
export interface SubmitRequest {
  productName: string;
  listingUrl: string;
  claimedSpecs: Record<string, string>;
  actualSpecs: Record<string, string>;
  verdict: string;
  images: string[];  // base64 encoded
  componentList: ComponentSpecs[];
}

export interface SubmitResponse {
  success: boolean;
  submissionId: string | null;
  error: string | null;
}

/** GET /api/community/search */
export interface CommunitySearchParams {
  query: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface CommunitySearchResponse {
  results: CommunitySubmission[];
  totalCount: number;
  hasMore: boolean;
}

/** Full community submission */
export interface CommunitySubmission {
  id: string;
  productName: string;
  listingUrl: string;
  listingUrlHash: string;
  claimedSpecs: Record<string, string>;
  actualSpecs: Record<string, string>;
  verdict: string;
  images: string[];
  componentList: ComponentSpecs[];
  submitterId: string | null;
  submitterReputation: number;
  upvotes: number;
  downvotes: number;
  createdAt: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. STORAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cached datasheet entry in local SQLite
 */
export interface DatasheetCacheEntry {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  specsJson: string;  // JSON-encoded Record<string, SpecValue>
  datasheetUrl: string | null;
  fetchedAt: number;
  expiresAt: number;
}

/**
 * A scan in history
 */
export interface ScanRecord {
  id: string;
  timestamp: number;
  claimCategory: ClaimCategory;
  claimValue: number;
  claimUnit: string;
  verdict: VerdictResult;
  confidence: VerdictConfidence;
  maxPossible: number;
  componentsJson: string;  // JSON-encoded ComponentWithSpecs[]
  thumbnailUri: string | null;
}

/**
 * A saved/bookmarked product
 */
export interface SavedProduct {
  id: string;
  name: string;
  listingUrl: string | null;
  claimedSpecsJson: string;
  actualSpecsJson: string;
  verdict: VerdictResult;
  notes: string | null;
  thumbnailUri: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Offline component pattern for matching
 */
export interface ComponentPattern {
  pattern: string;        // Regex or exact match
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  priority: number;       // Higher = check first
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. UI STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Overall app state
 */
export interface AppState {
  /** Current screen */
  currentScreen: Screen;
  /** Camera state */
  camera: CameraState;
  /** Current scan state */
  scan: ScanState;
  /** Analysis state */
  analysis: AnalysisState;
  /** UI preferences */
  preferences: UserPreferences;
}

export type Screen =
  | 'scan'
  | 'result'
  | 'history'
  | 'saved'
  | 'community'
  | 'settings';

export interface CameraState {
  isReady: boolean;
  isActive: boolean;
  permission: PermissionStatus;
  config: CameraConfig;
  error: string | null;
}

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface ScanState {
  /** Current processing stage */
  stage: ScanStage;
  /** Current frame being processed */
  currentFrame: CameraFrame | null;
  /** Detected regions */
  detections: DetectedRegion[];
  /** Matched components */
  matches: MatchedComponent[];
  /** Components with specs */
  components: ComponentWithSpecs[];
  /** Processing errors */
  errors: string[];
}

export type ScanStage =
  | 'idle'
  | 'detecting'
  | 'extracting'
  | 'matching'
  | 'loading_specs'
  | 'ready';

export interface AnalysisState {
  /** Current claim being evaluated */
  claim: Claim | null;
  /** Constraint chain */
  chain: ConstraintChain | null;
  /** Final verdict */
  verdict: Verdict | null;
  /** Is analysis in progress */
  isAnalyzing: boolean;
  /** Analysis error */
  error: string | null;
}

export interface UserPreferences {
  /** Theme */
  theme: 'light' | 'dark' | 'system';
  /** Haptic feedback enabled */
  haptics: boolean;
  /** Sound effects enabled */
  sounds: boolean;
  /** Default claim category */
  defaultClaimCategory: ClaimCategory;
  /** Show advanced details */
  showAdvancedDetails: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. CATEGORY-SPECIFIC SPEC TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard spec keys for each component category.
 * Use these keys when accessing specs Record.
 */
export const SpecKeys = {
  LED: {
    luminousFlux: 'luminous_flux',           // lumens
    forwardVoltage: 'forward_voltage',       // V
    maxCurrent: 'max_current',               // mA
    thermalResistance: 'thermal_resistance', // °C/W
    colorTemp: 'color_temp',                 // K
    cri: 'cri',                              // 0-100
  },
  LEDDriver: {
    maxOutputCurrent: 'max_output_current',  // mA
    inputVoltageMin: 'input_voltage_min',    // V
    inputVoltageMax: 'input_voltage_max',    // V
    efficiency: 'efficiency',                // %
    switchingFreq: 'switching_freq',         // kHz
  },
  BatteryCell: {
    nominalCapacity: 'nominal_capacity',     // mAh
    nominalVoltage: 'nominal_voltage',       // V
    maxContinuousDisch: 'max_continuous_discharge', // A
    maxPulseDisch: 'max_pulse_discharge',    // A
    internalResistance: 'internal_resistance', // mΩ
    chemistry: 'chemistry',                  // string
  },
  USBPD: {
    maxPower: 'max_power',                   // W
    supportedVoltages: 'supported_voltages', // V (array as string)
    maxCurrent: 'max_current',               // A
  },
  AudioAmp: {
    outputPower: 'output_power',             // W
    loadImpedance: 'load_impedance',         // Ω
    thd: 'thd',                              // %
    supplyVoltageMin: 'supply_voltage_min',  // V
    supplyVoltageMax: 'supply_voltage_max',  // V
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 8. UTILITY TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result type for operations that can fail
 */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Async operation status
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Generic async state
 */
export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}
