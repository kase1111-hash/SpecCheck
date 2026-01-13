/**
 * Performance Budget
 *
 * Enforces performance budgets and alerts when exceeded.
 */

import {
  PerformanceTargets,
  SizeTargets,
  ResourceTargets,
  getTargetStatus,
} from './PerformanceTargets';
import { getPerformanceMonitor } from './PerformanceMonitor';

/**
 * Budget violation
 */
export interface BudgetViolation {
  category: 'time' | 'size' | 'resource';
  metric: string;
  value: number;
  target: number;
  maximum: number;
  unit: string;
  severity: 'warning' | 'error';
  suggestion: string;
}

/**
 * Check if a value exceeds budget
 */
export function checkBudget(
  category: 'time' | 'size' | 'resource',
  metric: string,
  value: number,
  target: { target: number; maximum: number; unit: string }
): BudgetViolation | null {
  const status = getTargetStatus(value, target);

  if (status === 'good') return null;

  return {
    category,
    metric,
    value,
    target: target.target,
    maximum: target.maximum,
    unit: target.unit,
    severity: status === 'acceptable' ? 'warning' : 'error',
    suggestion: getSuggestion(metric, value, target),
  };
}

/**
 * Get suggestion for fixing a violation
 */
function getSuggestion(
  metric: string,
  value: number,
  target: { target: number; maximum: number; unit: string }
): string {
  const suggestions: Record<string, string> = {
    'detectionInference': 'Consider using a smaller ML model or reducing input resolution',
    'ocrPerRegion': 'Reduce OCR region size or use lower resolution',
    'specRetrievalAPI': 'Improve cache hit rate or add more bundled components',
    'fullScanCached': 'Profile pipeline stages to find bottleneck',
    'fullScanWithAPI': 'Add more components to local cache',
    'coldStart': 'Defer non-critical initialization, lazy load models',
    'mlModelSize': 'Use quantization or pruning to reduce model size',
    'appBundleSize': 'Audit dependencies, remove unused code',
    'memoryScan': 'Release camera frames after processing, reduce batch size',
  };

  return suggestions[metric] || 'Review implementation for optimization opportunities';
}

/**
 * Performance Budget Manager
 */
export class PerformanceBudgetManager {
  private violations: BudgetViolation[] = [];
  private listeners: Array<(violation: BudgetViolation) => void> = [];

  /**
   * Check a timing measurement against budget
   */
  checkTiming(metric: keyof typeof PerformanceTargets, value: number): void {
    const target = PerformanceTargets[metric];
    if ('maximum' in target) {
      const violation = checkBudget('time', metric, value, target as any);
      if (violation) {
        this.reportViolation(violation);
      }
    }
  }

  /**
   * Check a size measurement against budget
   */
  checkSize(metric: keyof typeof SizeTargets, value: number): void {
    const target = SizeTargets[metric];
    const violation = checkBudget('size', metric, value, target);
    if (violation) {
      this.reportViolation(violation);
    }
  }

  /**
   * Check a resource measurement against budget
   */
  checkResource(metric: keyof typeof ResourceTargets, value: number): void {
    const target = ResourceTargets[metric];
    const violation = checkBudget('resource', metric, value, target);
    if (violation) {
      this.reportViolation(violation);
    }
  }

  /**
   * Report a violation
   */
  private reportViolation(violation: BudgetViolation): void {
    this.violations.push(violation);

    // Log in development
    if (__DEV__) {
      const icon = violation.severity === 'error' ? '🔴' : '🟡';
      console.warn(
        `${icon} Performance budget exceeded: ${violation.metric}`,
        `\n   Value: ${violation.value}${violation.unit}`,
        `\n   Target: ${violation.target}${violation.unit}`,
        `\n   Maximum: ${violation.maximum}${violation.unit}`,
        `\n   Suggestion: ${violation.suggestion}`
      );
    }

    // Notify listeners
    for (const listener of this.listeners) {
      listener(violation);
    }
  }

  /**
   * Subscribe to violations
   */
  onViolation(listener: (violation: BudgetViolation) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  /**
   * Get all violations
   */
  getViolations(): BudgetViolation[] {
    return [...this.violations];
  }

  /**
   * Get violation summary
   */
  getSummary(): { errors: number; warnings: number } {
    return {
      errors: this.violations.filter((v) => v.severity === 'error').length,
      warnings: this.violations.filter((v) => v.severity === 'warning').length,
    };
  }

  /**
   * Clear violations
   */
  clear(): void {
    this.violations = [];
  }
}

/**
 * Development mode flag
 */
declare const __DEV__: boolean;

/**
 * Singleton instance
 */
let budgetManager: PerformanceBudgetManager | null = null;

/**
 * Get budget manager instance
 */
export function getPerformanceBudgetManager(): PerformanceBudgetManager {
  if (!budgetManager) {
    budgetManager = new PerformanceBudgetManager();
  }
  return budgetManager;
}

/**
 * HOF to wrap a function with timing and budget check
 */
export function withPerformanceBudget<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  metric: keyof typeof PerformanceTargets
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    try {
      return await fn(...args);
    } finally {
      const duration = performance.now() - start;
      getPerformanceMonitor().record(metric, duration, 'ms');
      getPerformanceBudgetManager().checkTiming(metric, duration);
    }
  }) as T;
}
