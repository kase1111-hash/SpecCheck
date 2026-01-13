/**
 * ClaimParser
 *
 * Parses user input into structured claims.
 * Handles various formats: "10000 lumens", "10k lm", "10,000lm"
 */

import type { Claim, ClaimCategory, ClaimSource } from '@speccheck/shared-types';

/**
 * Unit mappings to canonical forms
 */
const UNIT_MAPPINGS: Record<string, { unit: string; category: ClaimCategory }> = {
  // Lumens
  'lm': { unit: 'lm', category: 'lumens' },
  'lumen': { unit: 'lm', category: 'lumens' },
  'lumens': { unit: 'lm', category: 'lumens' },

  // Capacity
  'mah': { unit: 'mAh', category: 'mah' },
  'ah': { unit: 'mAh', category: 'mah' }, // Will convert
  'wh': { unit: 'Wh', category: 'wh' },

  // Power
  'w': { unit: 'W', category: 'watts' },
  'watt': { unit: 'W', category: 'watts' },
  'watts': { unit: 'W', category: 'watts' },

  // Current
  'a': { unit: 'A', category: 'amps' },
  'amp': { unit: 'A', category: 'amps' },
  'amps': { unit: 'A', category: 'amps' },
  'ma': { unit: 'mA', category: 'amps' },

  // Voltage
  'v': { unit: 'V', category: 'volts' },
  'volt': { unit: 'V', category: 'volts' },
  'volts': { unit: 'V', category: 'volts' },
};

/**
 * Multiplier suffixes
 */
const MULTIPLIERS: Record<string, number> = {
  'k': 1000,
  'm': 1000000,
};

/**
 * Parse a claim string into a structured Claim
 */
export function parseClaim(
  input: string,
  source: ClaimSource = 'user_input'
): Claim | null {
  const originalText = input.trim();

  if (!originalText) {
    return null;
  }

  // Normalize input
  let normalized = originalText
    .toLowerCase()
    .replace(/,/g, '') // Remove commas
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Try to extract number and unit
  // Patterns: "10000 lumens", "10k lm", "10000lm", "10.5w"
  const patterns = [
    // Number with suffix and unit: "10k lumens"
    /^([\d.]+)\s*(k|m)?\s*([a-z]+)$/i,
    // Number and unit: "10000 lumens"
    /^([\d.]+)\s+([a-z]+)$/i,
    // Number attached to unit: "10000lm"
    /^([\d.]+)([a-z]+)$/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      let value = parseFloat(match[1]);
      const multiplier = match.length === 4 ? match[2]?.toLowerCase() : null;
      const unitStr = (match.length === 4 ? match[3] : match[2]).toLowerCase();

      // Apply multiplier
      if (multiplier && MULTIPLIERS[multiplier]) {
        value *= MULTIPLIERS[multiplier];
      }

      // Look up unit
      const unitInfo = UNIT_MAPPINGS[unitStr];
      if (!unitInfo) {
        continue; // Unknown unit, try next pattern
      }

      // Handle unit conversions
      if (unitStr === 'ah') {
        value *= 1000; // Convert Ah to mAh
      }

      return {
        category: unitInfo.category,
        value,
        unit: unitInfo.unit,
        source,
        originalText,
      };
    }
  }

  return null;
}

/**
 * Parse multiple claims from text
 */
export function parseMultipleClaims(
  input: string,
  source: ClaimSource = 'user_input'
): Claim[] {
  const claims: Claim[] = [];

  // Split by common delimiters
  const parts = input.split(/[,;\/]|\band\b/i);

  for (const part of parts) {
    const claim = parseClaim(part.trim(), source);
    if (claim) {
      claims.push(claim);
    }
  }

  return claims;
}

/**
 * Validate a claim value is reasonable
 */
export function validateClaim(claim: Claim): { valid: boolean; warning?: string } {
  // Check for obviously unreasonable values
  const limits: Record<ClaimCategory, { min: number; max: number; warning: string }> = {
    lumens: { min: 1, max: 100000, warning: 'Lumen values above 100,000 are extremely rare' },
    mah: { min: 100, max: 100000, warning: 'Capacity above 100,000mAh is unusual for portable devices' },
    wh: { min: 1, max: 1000, warning: 'Energy above 1000Wh is unusual for portable devices' },
    watts: { min: 1, max: 10000, warning: 'Power above 10kW is unusual' },
    amps: { min: 0.1, max: 1000, warning: 'Current above 1000A is unusual' },
    volts: { min: 0.1, max: 1000, warning: 'Voltage above 1000V is unusual for consumer devices' },
  };

  const limit = limits[claim.category];
  if (!limit) {
    return { valid: true };
  }

  if (claim.value < limit.min || claim.value > limit.max) {
    return { valid: false, warning: limit.warning };
  }

  return { valid: true };
}

/**
 * Format a claim value for display
 */
export function formatClaimValue(value: number, unit: string): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ${unit}`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k ${unit}`;
  }
  if (value < 1) {
    return `${value.toFixed(2)} ${unit}`;
  }
  return `${Math.round(value).toLocaleString()} ${unit}`;
}
