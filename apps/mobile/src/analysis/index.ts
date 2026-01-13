/**
 * Analysis Module
 *
 * Handles claim validation and constraint chain evaluation.
 *
 * Responsibilities:
 * - Parse and validate user claims
 * - Build constraint chains from components
 * - Evaluate bottlenecks in the chain
 * - Generate human-readable verdicts
 * - Category-specific validation rules
 */

export {
  parseClaim,
  parseMultipleClaims,
  validateClaim,
  formatClaimValue,
} from './ClaimParser';

export { buildConstraintChain } from './ConstraintChainBuilder';

export {
  generateVerdict,
  getVerdictColor,
  getVerdictIcon,
  getVerdictLabel,
  getConfidenceDescription,
  formatVerdictForShare,
} from './VerdictGenerator';
