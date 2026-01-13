/**
 * Performance Monitor
 *
 * Tracks and reports performance metrics across the app.
 */

import {
  PerformanceTargets,
  QualityTargets,
  getTargetStatus,
  type TargetStatus,
} from './PerformanceTargets';

/**
 * A single performance measurement
 */
export interface Measurement {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated metrics for a measurement type
 */
export interface MetricStats {
  name: string;
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p99: number;
  unit: string;
  status: TargetStatus;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  generatedAt: number;
  sessionDuration: number;
  metrics: Record<string, MetricStats>;
  warnings: string[];
  summary: {
    good: number;
    acceptable: number;
    poor: number;
  };
}

/**
 * Performance Monitor class
 */
export class PerformanceMonitor {
  private measurements: Map<string, Measurement[]> = new Map();
  private sessionStart: number = Date.now();
  private enabled: boolean = true;
  private maxMeasurements: number = 1000;

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Record a measurement
   */
  record(name: string, value: number, unit: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const measurement: Measurement = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }

    const measurements = this.measurements.get(name)!;
    measurements.push(measurement);

    // Keep only recent measurements
    if (measurements.length > this.maxMeasurements) {
      measurements.shift();
    }
  }

  /**
   * Time an async operation
   */
  async time<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.record(name, duration, 'ms', metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(name, duration, 'ms', { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Time a sync operation
   */
  timeSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const start = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - start;
      this.record(name, duration, 'ms', metadata);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record(name, duration, 'ms', { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Create a timer that can be stopped manually
   */
  startTimer(name: string, metadata?: Record<string, unknown>): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.record(name, duration, 'ms', metadata);
      return duration;
    };
  }

  /**
   * Get stats for a metric
   */
  getStats(name: string): MetricStats | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) return null;

    const values = measurements.map((m) => m.value).sort((a, b) => a - b);
    const count = values.length;

    const stats: MetricStats = {
      name,
      count,
      min: values[0],
      max: values[count - 1],
      mean: values.reduce((a, b) => a + b, 0) / count,
      p50: values[Math.floor(count * 0.5)],
      p90: values[Math.floor(count * 0.9)],
      p99: values[Math.floor(count * 0.99)],
      unit: measurements[0].unit,
      status: 'good',
    };

    // Determine status based on targets
    const target = this.getTargetForMetric(name);
    if (target) {
      stats.status = getTargetStatus(stats.p90, target);
    }

    return stats;
  }

  /**
   * Get target for a metric name
   */
  private getTargetForMetric(
    name: string
  ): { target: number; maximum?: number; minimum?: number } | null {
    // Map metric names to targets
    const targetMap: Record<string, keyof typeof PerformanceTargets | keyof typeof QualityTargets> = {
      'detection.inference': 'detectionInference',
      'ocr.extraction': 'ocrPerRegion',
      'matching.cache': 'matchingCacheHit',
      'matching.fuzzy': 'matchingFuzzy',
      'specs.cache': 'specRetrievalCache',
      'specs.api': 'specRetrievalAPI',
      'analysis.chain': 'constraintChain',
      'analysis.verdict': 'verdictGeneration',
      'pipeline.full': 'fullScanCached',
      'pipeline.withApi': 'fullScanWithAPI',
      'app.coldStart': 'coldStart',
      'app.warmStart': 'warmStart',
      'model.load': 'modelLoad',
    };

    const targetKey = targetMap[name];
    if (targetKey && targetKey in PerformanceTargets) {
      return PerformanceTargets[targetKey as keyof typeof PerformanceTargets];
    }
    if (targetKey && targetKey in QualityTargets) {
      return QualityTargets[targetKey as keyof typeof QualityTargets];
    }

    return null;
  }

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport {
    const metrics: Record<string, MetricStats> = {};
    const warnings: string[] = [];
    let good = 0;
    let acceptable = 0;
    let poor = 0;

    for (const name of this.measurements.keys()) {
      const stats = this.getStats(name);
      if (stats) {
        metrics[name] = stats;

        switch (stats.status) {
          case 'good':
            good++;
            break;
          case 'acceptable':
            acceptable++;
            warnings.push(`${name}: p90=${stats.p90}${stats.unit} (acceptable)`);
            break;
          case 'poor':
            poor++;
            warnings.push(`${name}: p90=${stats.p90}${stats.unit} (POOR)`);
            break;
        }
      }
    }

    return {
      generatedAt: Date.now(),
      sessionDuration: Date.now() - this.sessionStart,
      metrics,
      warnings,
      summary: { good, acceptable, poor },
    };
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
    this.sessionStart = Date.now();
  }

  /**
   * Export measurements for debugging
   */
  export(): Record<string, Measurement[]> {
    const result: Record<string, Measurement[]> = {};
    for (const [key, value] of this.measurements.entries()) {
      result[key] = [...value];
    }
    return result;
  }
}

/**
 * Singleton instance
 */
let monitorInstance: PerformanceMonitor | null = null;

/**
 * Get the performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

/**
 * Convenience function to time an operation
 */
export async function measureTime<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  return getPerformanceMonitor().time(name, operation);
}

/**
 * Convenience function to start a timer
 */
export function startMeasure(name: string): () => number {
  return getPerformanceMonitor().startTimer(name);
}
