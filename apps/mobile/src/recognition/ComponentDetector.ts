/**
 * ComponentDetector
 *
 * Runs on-device ML model to detect electronic components
 * in camera frames.
 */

import type {
  CameraFrame,
  DetectedRegion,
  DetectionResult,
  ComponentCategory,
  BoundingBox,
} from '@speccheck/shared-types';

/** Detection confidence threshold */
const CONFIDENCE_THRESHOLD = 0.7;

/** Model input size */
const MODEL_INPUT_SIZE = 320;

/** Model version identifier */
const MODEL_VERSION = '1.0.0';

/**
 * Generate unique region ID
 */
function generateRegionId(): string {
  return `r_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Component detection service
 */
export class ComponentDetector {
  private isModelLoaded: boolean = false;

  /**
   * Load the ML model
   * Call this once during app initialization
   */
  async loadModel(): Promise<void> {
    // TODO: Load TFLite model
    // const model = await loadTensorFlowLiteModel('component_detector.tflite');
    this.isModelLoaded = true;
    console.log('[ComponentDetector] Model loaded');
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.isModelLoaded;
  }

  /**
   * Detect components in a camera frame
   */
  async detect(frame: CameraFrame): Promise<DetectionResult> {
    const startTime = Date.now();

    if (!this.isModelLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // TODO: Actual ML inference
    // 1. Preprocess image (resize to MODEL_INPUT_SIZE)
    // 2. Run inference
    // 3. Post-process results (NMS, threshold)

    // For now, return mock detection results for development
    const regions = await this.runInference(frame);

    const processingTimeMs = Date.now() - startTime;

    return {
      frameId: frame.id,
      regions,
      processingTimeMs,
      modelVersion: MODEL_VERSION,
    };
  }

  /**
   * Run ML inference on the frame
   * This is a placeholder that returns mock data during development
   */
  private async runInference(frame: CameraFrame): Promise<DetectedRegion[]> {
    // TODO: Replace with actual TFLite inference
    // Example mock detection for development:

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 30));

    // In development, return empty array
    // In production, this would be actual ML detections
    return [];
  }

  /**
   * Convert raw model output to DetectedRegion
   */
  private processDetection(
    frameId: string,
    bbox: number[], // [x, y, width, height] normalized 0-1
    category: number,
    confidence: number,
    frameWidth: number,
    frameHeight: number
  ): DetectedRegion | null {
    if (confidence < CONFIDENCE_THRESHOLD) {
      return null;
    }

    const categoryMap: ComponentCategory[] = [
      'led',
      'led_driver',
      'battery_cell',
      'bms',
      'usb_pd',
      'dc_dc',
      'audio_amp',
      'motor_driver',
      'mcu',
      'capacitor',
      'inductor',
      'connector',
      'ic_generic',
    ];

    const detectedCategory = categoryMap[category] || 'unknown';

    // Convert normalized coordinates to pixel coordinates
    const pixelBbox: BoundingBox = {
      x: bbox[0] * frameWidth,
      y: bbox[1] * frameHeight,
      width: bbox[2] * frameWidth,
      height: bbox[3] * frameHeight,
    };

    return {
      regionId: generateRegionId(),
      frameId,
      bbox: pixelBbox,
      confidence,
      category: detectedCategory,
      detectedAt: Date.now(),
    };
  }

  /**
   * Apply Non-Maximum Suppression to remove overlapping detections
   */
  private applyNMS(
    regions: DetectedRegion[],
    iouThreshold: number = 0.5
  ): DetectedRegion[] {
    if (regions.length === 0) return [];

    // Sort by confidence descending
    const sorted = [...regions].sort((a, b) => b.confidence - a.confidence);
    const selected: DetectedRegion[] = [];

    while (sorted.length > 0) {
      const current = sorted.shift()!;
      selected.push(current);

      // Remove overlapping boxes
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (this.calculateIoU(current.bbox, sorted[i].bbox) > iouThreshold) {
          sorted.splice(i, 1);
        }
      }
    }

    return selected;
  }

  /**
   * Calculate Intersection over Union (IoU) for two bounding boxes
   */
  private calculateIoU(a: BoundingBox, b: BoundingBox): number {
    const xOverlap = Math.max(
      0,
      Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
    );
    const yOverlap = Math.max(
      0,
      Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
    );

    const intersection = xOverlap * yOverlap;
    const aArea = a.width * a.height;
    const bArea = b.width * b.height;
    const union = aArea + bArea - intersection;

    return union > 0 ? intersection / union : 0;
  }
}

/**
 * Singleton instance
 */
let detectorInstance: ComponentDetector | null = null;

/**
 * Get the component detector instance
 */
export function getComponentDetector(): ComponentDetector {
  if (!detectorInstance) {
    detectorInstance = new ComponentDetector();
  }
  return detectorInstance;
}
