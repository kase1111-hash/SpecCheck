/**
 * Shared Types Package
 *
 * Types shared between mobile app and backend.
 * Import from '@speccheck/shared-types'
 */

// ============ Component Types ============

export type ComponentCategory =
  | 'ic'
  | 'led'
  | 'battery'
  | 'pouch_cell'
  | 'capacitor'
  | 'inductor'
  | 'connector'
  | 'unknown';

export interface SpecValue {
  value: number;
  unit: string;
  conditions: string | null;
  min: number | null;
  max: number | null;
  typical: number | null;
}

export interface ComponentSpecs {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  specs: Record<string, SpecValue>;
}

// ============ Claim Types ============

export type ClaimCategory = 'lumens' | 'mah' | 'watts' | 'amps';

export interface Claim {
  category: ClaimCategory;
  value: number;
  unit: string;
  source: string;
}

// ============ Analysis Types ============

export type VerdictResult = 'plausible' | 'impossible' | 'uncertain';
export type VerdictConfidence = 'high' | 'medium' | 'low';

export interface ChainLink {
  component: string;
  constraintType: string;
  maxValue: number;
  unit: string;
  isBottleneck: boolean;
  explanation: string;
}

export interface ConstraintChain {
  claim: Claim;
  links: ChainLink[];
  bottleneck: ChainLink | null;
  maxPossible: number;
  unit: string;
  verdict: VerdictResult;
}

export interface Verdict {
  result: VerdictResult;
  claimed: number;
  maxPossible: number;
  unit: string;
  bottleneck: string | null;
  explanation: string;
  confidence: VerdictConfidence;
}

// ============ API Types ============

export interface DatasheetResponse {
  partNumber: string;
  manufacturer: string;
  category: string;
  specs: Record<string, SpecValue>;
  datasheetUrl: string;
  lastUpdated: number;
}

export interface AnalyzeRequest {
  claim: Claim;
  components: ComponentSpecs[];
  category: string;
}

export interface AnalyzeResponse {
  verdict: VerdictResult;
  maxPossible: number;
  unit: string;
  reasoning: string;
  chain: ChainLink[];
}

// ============ Community Types ============

export interface CommunitySubmission {
  id: string;
  productName: string;
  listingUrl: string;
  claimedSpecs: Record<string, string>;
  actualSpecs: Record<string, string>;
  verdict: string;
  images: string[];
  componentList: ComponentSpecs[];
  createdAt: number;
  submitterReputation: number;
  upvotes: number;
  downvotes: number;
}
