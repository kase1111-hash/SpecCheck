/**
 * Recognition module types
 */

export type ComponentCategory =
  | 'ic'
  | 'led'
  | 'battery'
  | 'pouch_cell'
  | 'capacitor'
  | 'inductor'
  | 'connector'
  | 'unknown';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedRegion {
  /** Unique identifier for this detection */
  regionId: string;
  /** Bounding box in image coordinates */
  bbox: BoundingBox;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Detected component category */
  category: ComponentCategory;
}

export interface ExtractedText {
  /** Reference to detected region */
  regionId: string;
  /** Raw OCR lines */
  lines: string[];
  /** OCR confidence (0-1) */
  confidence: number;
  /** Cleaned and normalized text */
  cleaned: string;
}

export interface MatchedComponent {
  /** Reference to detected region */
  regionId: string;
  /** Identified part number */
  partNumber: string;
  /** Component manufacturer */
  manufacturer: string;
  /** Component category */
  category: ComponentCategory;
  /** Match confidence (0-1) */
  matchConfidence: number;
  /** Reference to datasheet in cache/API */
  datasheetId: string | null;
}

export type MatchStatus = 'confident' | 'partial' | 'unknown';
