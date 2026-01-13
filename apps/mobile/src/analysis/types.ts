/**
 * Analysis module types
 */

import type { MatchedComponent } from '../recognition/types';

export type ClaimCategory = 'lumens' | 'mah' | 'watts' | 'amps';

export interface Claim {
  /** Type of claim */
  category: ClaimCategory;
  /** Claimed value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Where the claim came from */
  source: string;
}

export interface ChainLink {
  /** Component in the chain */
  component: MatchedComponent;
  /** Type of constraint this link represents */
  constraintType: string;
  /** Maximum value this component can support */
  maxValue: number;
  /** Unit of measurement */
  unit: string;
  /** Is this the limiting factor? */
  isBottleneck: boolean;
  /** Human-readable explanation */
  explanation: string;
}

export interface ConstraintChain {
  /** The claim being evaluated */
  claim: Claim;
  /** Links in the constraint chain */
  links: ChainLink[];
  /** The bottleneck link (if any) */
  bottleneck: ChainLink | null;
  /** Maximum possible output */
  maxPossible: number;
  /** Unit for max possible */
  unit: string;
  /** Overall verdict */
  verdict: VerdictResult;
}

export type VerdictResult = 'plausible' | 'impossible' | 'uncertain';

export type VerdictConfidence = 'high' | 'medium' | 'low';

export interface Verdict {
  /** Result of validation */
  result: VerdictResult;
  /** Claimed value */
  claimed: number;
  /** Maximum possible value */
  maxPossible: number;
  /** Unit of measurement */
  unit: string;
  /** Bottleneck component (if applicable) */
  bottleneck: string | null;
  /** Human-readable explanation */
  explanation: string;
  /** Confidence level */
  confidence: VerdictConfidence;
}

/**
 * Category-specific validator function signature
 */
export type CategoryValidator = (
  claim: Claim,
  components: MatchedComponent[]
) => Promise<ConstraintChain>;
