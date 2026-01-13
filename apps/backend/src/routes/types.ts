/**
 * API Route Types
 *
 * Request and response types for all API endpoints.
 */

// ============ Datasheet Types ============

export interface DatasheetResponse {
  partNumber: string;
  manufacturer: string;
  category: string;
  specs: Record<string, SpecValue>;
  datasheetUrl: string;
  lastUpdated: number;
}

export interface SpecValue {
  value: number;
  unit: string;
  conditions: string | null;
  min: number | null;
  max: number | null;
  typical: number | null;
}

export interface SearchRequest {
  query: string;
  category?: string;
}

export interface IdentifyRequest {
  textLines: string[];
  categoryHint?: string;
}

export interface DatasheetMatch {
  partNumber: string;
  manufacturer: string;
  category: string;
  confidence: number;
}

// ============ Analyze Types ============

export interface AnalyzeRequest {
  claim: Claim;
  components: ComponentSpecs[];
  category: string;
}

export interface Claim {
  category: string;
  value: number;
  unit: string;
}

export interface ComponentSpecs {
  partNumber: string;
  manufacturer: string;
  category: string;
  specs: Record<string, SpecValue>;
}

export interface AnalyzeResponse {
  verdict: 'plausible' | 'impossible' | 'uncertain';
  maxPossible: number;
  unit: string;
  reasoning: string;
  chain: ChainLink[];
}

export interface ChainLink {
  component: string;
  constraintType: string;
  maxValue: number;
  unit: string;
  isBottleneck: boolean;
  explanation: string;
}

// ============ Community Types ============

export interface SubmitRequest {
  productName: string;
  listingUrl: string;
  claimedSpecs: Record<string, string>;
  actualSpecs: Record<string, string>;
  verdict: string;
  images: string[]; // base64 or URLs
  componentList: ComponentSpecs[];
}

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

export interface CommunitySearchParams {
  q: string;
  category?: string;
  limit?: number;
  offset?: number;
}
