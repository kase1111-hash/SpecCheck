/**
 * Storage module types
 */

export interface ScanRecord {
  /** Unique scan ID */
  id: string;
  /** Scan timestamp */
  timestamp: number;
  /** Category of claim evaluated */
  claimCategory: string;
  /** Claimed value */
  claimValue: number;
  /** Verdict result */
  verdict: string;
  /** Maximum possible value */
  maxPossible: number;
  /** JSON-encoded component list */
  componentsJson: string;
  /** Path to thumbnail image */
  thumbnailPath: string | null;
}

export interface SavedProduct {
  /** Unique product ID */
  id: string;
  /** Product name */
  name: string;
  /** Original listing URL */
  listingUrl: string | null;
  /** JSON-encoded claimed specs */
  claimedSpecsJson: string;
  /** JSON-encoded actual specs */
  actualSpecsJson: string;
  /** Verdict summary */
  verdict: string;
  /** User notes */
  notes: string | null;
  /** Save timestamp */
  createdAt: number;
}

export interface ComponentPattern {
  /** Text pattern to match */
  pattern: string;
  /** Known part number */
  partNumber: string;
  /** Manufacturer */
  manufacturer: string;
  /** Category */
  category: string;
}

export interface DatabaseConfig {
  /** Database file name */
  name: string;
  /** Database version for migrations */
  version: number;
}
