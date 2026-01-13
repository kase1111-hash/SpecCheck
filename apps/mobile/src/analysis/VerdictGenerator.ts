/**
 * VerdictGenerator
 *
 * Generates human-readable verdicts from constraint chains.
 */

import type {
  ConstraintChain,
  Verdict,
  VerdictResult,
  VerdictConfidence,
} from '@speccheck/shared-types';
import { formatClaimValue } from './ClaimParser';

/**
 * Generate a verdict from a constraint chain
 */
export function generateVerdict(chain: ConstraintChain): Verdict {
  const { claim, bottleneck, maxPossible, verdict, confidence, links } = chain;

  // Generate explanation
  const explanation = generateExplanation(chain);

  // Generate details
  const details = generateDetails(chain);

  return {
    result: verdict,
    confidence,
    claimed: claim.value,
    maxPossible,
    unit: claim.unit,
    bottleneck: bottleneck?.component.specs?.partNumber || null,
    explanation,
    details,
    analyzedAt: Date.now(),
  };
}

/**
 * Generate main explanation text
 */
function generateExplanation(chain: ConstraintChain): string {
  const { claim, bottleneck, maxPossible, verdict, links } = chain;

  const claimedStr = formatClaimValue(claim.value, claim.unit);
  const maxStr = formatClaimValue(maxPossible, chain.unit);

  if (verdict === 'uncertain') {
    return `Cannot verify the ${claimedStr} claim. Not enough components were identified to complete the analysis.`;
  }

  if (verdict === 'plausible') {
    return `The ${claimedStr} claim is physically plausible. The identified components can support up to ${maxStr}.`;
  }

  // Impossible
  if (bottleneck) {
    const partNumber = bottleneck.component.specs?.partNumber || 'Unknown component';
    return `The ${claimedStr} claim is physically impossible. The ${partNumber} limits output to ${maxStr}.`;
  }

  return `The ${claimedStr} claim exceeds the physical limits of the identified components. Maximum possible: ${maxStr}.`;
}

/**
 * Generate detailed breakdown
 */
function generateDetails(chain: ConstraintChain): string[] {
  const details: string[] = [];
  const { links, verdict, claim, maxPossible } = chain;

  if (links.length === 0) {
    details.push('No relevant components were identified.');
    details.push('Manual verification is recommended.');
    return details;
  }

  // Summary line
  if (verdict === 'impossible') {
    const ratio = ((maxPossible / claim.value) * 100).toFixed(0);
    details.push(`Claimed value is ${ratio}% of what's physically possible.`);
  }

  // Add each link's explanation
  for (const link of links) {
    let prefix = '•';
    if (link.isBottleneck) {
      prefix = '⚠️';
    }
    details.push(`${prefix} ${link.explanation}`);
  }

  // Add confidence note
  if (chain.confidence === 'low') {
    details.push('');
    details.push('⚠️ Low confidence: Some key components may not have been identified.');
  } else if (chain.confidence === 'medium') {
    details.push('');
    details.push('ℹ️ Medium confidence: Analysis based on partial component identification.');
  }

  return details;
}

/**
 * Get color for verdict display
 */
export function getVerdictColor(verdict: VerdictResult): string {
  switch (verdict) {
    case 'plausible':
      return '#22C55E'; // Green
    case 'impossible':
      return '#EF4444'; // Red
    case 'uncertain':
      return '#EAB308'; // Yellow
    default:
      return '#6B7280'; // Gray
  }
}

/**
 * Get icon for verdict display
 */
export function getVerdictIcon(verdict: VerdictResult): string {
  switch (verdict) {
    case 'plausible':
      return '✓';
    case 'impossible':
      return '✗';
    case 'uncertain':
      return '?';
    default:
      return '•';
  }
}

/**
 * Get short label for verdict
 */
export function getVerdictLabel(verdict: VerdictResult): string {
  switch (verdict) {
    case 'plausible':
      return 'PLAUSIBLE';
    case 'impossible':
      return 'IMPOSSIBLE';
    case 'uncertain':
      return 'UNCERTAIN';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Get description for confidence level
 */
export function getConfidenceDescription(confidence: VerdictConfidence): string {
  switch (confidence) {
    case 'high':
      return 'All key components identified';
    case 'medium':
      return 'Most components identified';
    case 'low':
      return 'Limited component identification';
    default:
      return '';
  }
}

/**
 * Format verdict for sharing/export
 */
export function formatVerdictForShare(verdict: Verdict): string {
  const lines: string[] = [];

  lines.push(`SpecCheck Analysis`);
  lines.push(`==================`);
  lines.push(``);
  lines.push(`Claimed: ${formatClaimValue(verdict.claimed, verdict.unit)}`);
  lines.push(`Maximum Possible: ${formatClaimValue(verdict.maxPossible, verdict.unit)}`);
  lines.push(`Verdict: ${getVerdictLabel(verdict.result)}`);
  lines.push(``);
  lines.push(verdict.explanation);

  if (verdict.details.length > 0) {
    lines.push(``);
    lines.push(`Details:`);
    for (const detail of verdict.details) {
      lines.push(detail);
    }
  }

  lines.push(``);
  lines.push(`Analyzed: ${new Date(verdict.analyzedAt).toISOString()}`);

  return lines.join('\n');
}
