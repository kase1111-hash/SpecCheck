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
 *
 * Exports:
 * - validateClaim: Main claim validation function
 * - buildConstraintChain: Construct chain from specs
 * - ClaimValidator: Validation service class
 * - VerdictGenerator: Generate explanations
 */

export * from './ClaimValidator';
export * from './ConstraintChain';
export * from './CategoryRules';
export * from './VerdictGenerator';
export * from './types';
