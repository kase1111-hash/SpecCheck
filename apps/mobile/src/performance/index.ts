/**
 * Performance Module
 *
 * Defines targets, monitors metrics, and enforces budgets.
 */

export {
  PerformanceTargets,
  SizeTargets,
  ResourceTargets,
  QualityTargets,
  getTargetStatus,
  formatTarget,
} from './PerformanceTargets';

export {
  PerformanceMonitor,
  getPerformanceMonitor,
  measureTime,
  startMeasure,
  type Measurement,
  type MetricStats,
  type PerformanceReport,
} from './PerformanceMonitor';

export {
  PerformanceBudgetManager,
  getPerformanceBudgetManager,
  checkBudget,
  withPerformanceBudget,
  type BudgetViolation,
} from './PerformanceBudget';
