/**
 * ComponentDetector
 *
 * Runs on-device ML model to detect electronic components
 * in camera frames using TensorFlow Lite.
 */

import * as tf from '@tensorflow/tfjs';
import { decode as decodeJpeg } from 'jpeg-js';
import { Buffer } from 'buffer';
import type {
  CameraFrame,
  DetectedRegion,
  DetectionResult,
  BoundingBox,
} from '@speccheck/shared-types';
import {
  TFLiteModel,
  getTFLiteModel,
  DEFAULT_MODEL_CONFIG,
  CATEGORY_MAP,
  type ProcessedDetection,
  type ModelConfig,
} from './TFLiteModel';

/** Detection confidence threshold */
const CONFIDENCE_THRESHOLD = 0.5;

/** Model version identifier */
const MODEL_VERSION = '1.0.0';

/**
 * Generate unique region ID
 */
function generateRegionId(): string {
  return `r_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Decode base64 image to tensor
 */
async function base64ToTensor(
  base64: string,
  width: number,
  height: number
): Promise<tf.Tensor3D> {
  try {
    // Remove data URI prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Decode JPEG
    const rawData = decodeJpeg(buffer as any, { useTArray: true });

    // Create tensor from raw pixel data
    const tensor = tf.tensor3d(
      new Uint8Array(rawData.data),
      [rawData.height, rawData.width, 4], // RGBA
      'int32'
    );

    // Convert RGBA to RGB by dropping alpha channel
    const rgb = tensor.slice([0, 0, 0], [-1, -1, 3]);
    tensor.dispose();

    return rgb as tf.Tensor3D;
  } catch (error) {
    console.error('[ComponentDetector] Error decoding image:', error);
    // Return a placeholder tensor if decoding fails
    return tf.zeros([height, width, 3]) as tf.Tensor3D;
  }
}

/**
 * Component detection service using TFLite
 */
export class ComponentDetector {
  private model: TFLiteModel;
  private isModelLoaded: boolean = false;
  private modelConfig: ModelConfig;
  private useMockDetections: boolean = false;

  constructor() {
    this.model = getTFLiteModel();
    this.modelConfig = { ...DEFAULT_MODEL_CONFIG };
  }

  /**
   * Load the ML model
   * Call this once during app initialization
   */
  async loadModel(): Promise<void> {
    try {
      console.log('[ComponentDetector] Initializing TFLite model...');

      // Initialize and load the model
      await this.model.loadModel();

      this.isModelLoaded = true;
      this.useMockDetections = false;
      console.log('[ComponentDetector] Model loaded successfully');
    } catch (error) {
      console.error('[ComponentDetector] Failed to load model:', error);

      // In development, fall back to mock detections for UI work
      if (__DEV__) {
        this.useMockDetections = true;
        this.isModelLoaded = true;
        console.warn('[ComponentDetector] DEV MODE: Using mock detections as fallback');
      } else {
        // In production, fail honestly — do not pretend the model loaded
        this.isModelLoaded = false;
        this.useMockDetections = false;
        throw new Error(
          'Component detection model failed to load. Please update the app or try again later.'
        );
      }
    }
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.isModelLoaded;
  }

  /**
   * Get current model configuration
   */
  getModelConfig(): ModelConfig {
    return { ...this.modelConfig };
  }

  /**
   * Update model configuration
   */
  setModelConfig(config: Partial<ModelConfig>): void {
    this.modelConfig = { ...this.modelConfig, ...config };
  }

  /**
   * Detect components in a camera frame
   */
  async detect(frame: CameraFrame): Promise<DetectionResult> {
    const startTime = Date.now();

    if (!this.isModelLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    let regions: DetectedRegion[];

    if (this.useMockDetections) {
      // Use mock detections for development/fallback
      regions = await this.generateMockDetections(frame);
    } else {
      // Run actual ML inference
      regions = await this.runInference(frame);
    }

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
   */
  private async runInference(frame: CameraFrame): Promise<DetectedRegion[]> {
    try {
      // Convert base64 image to tensor
      const imageTensor = await base64ToTensor(
        frame.imageBase64,
        frame.width,
        frame.height
      );

      // Run detection through TFLite model
      const detections = await this.model.detect(
        imageTensor,
        frame.width,
        frame.height
      );

      // Cleanup
      imageTensor.dispose();

      // Convert to DetectedRegion format
      return detections.map((detection) =>
        this.convertToDetectedRegion(frame.id, detection)
      );
    } catch (error) {
      console.error('[ComponentDetector] Inference error:', error);
      // Return empty on error, log for debugging
      return [];
    }
  }

  /**
   * Convert ProcessedDetection to DetectedRegion
   */
  private convertToDetectedRegion(
    frameId: string,
    detection: ProcessedDetection
  ): DetectedRegion {
    return {
      regionId: generateRegionId(),
      frameId,
      bbox: detection.bbox,
      confidence: detection.confidence,
      category: detection.category,
      detectedAt: Date.now(),
    };
  }

  /**
   * Generate mock detections for development/testing
   */
  private async generateMockDetections(
    frame: CameraFrame
  ): Promise<DetectedRegion[]> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Return sample detections for UI development
    const mockDetections: ProcessedDetection[] = [
      {
        bbox: {
          x: frame.width * 0.2,
          y: frame.height * 0.3,
          width: frame.width * 0.15,
          height: frame.height * 0.1,
        },
        category: 'led',
        confidence: 0.92,
        categoryIndex: 0,
      },
      {
        bbox: {
          x: frame.width * 0.5,
          y: frame.height * 0.4,
          width: frame.width * 0.12,
          height: frame.height * 0.08,
        },
        category: 'led_driver',
        confidence: 0.87,
        categoryIndex: 1,
      },
      {
        bbox: {
          x: frame.width * 0.3,
          y: frame.height * 0.6,
          width: frame.width * 0.25,
          height: frame.height * 0.15,
        },
        category: 'battery_cell',
        confidence: 0.95,
        categoryIndex: 2,
      },
    ];

    return mockDetections.map((detection) =>
      this.convertToDetectedRegion(frame.id, detection)
    );
  }

  /**
   * Convert raw model output to DetectedRegion
   * Used for direct model output processing
   */
  processDetection(
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

    const detectedCategory = CATEGORY_MAP[category] || 'unknown';

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
  applyNMS(
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

  /**
   * Enable or disable mock detections
   */
  setUseMockDetections(useMock: boolean): void {
    this.useMockDetections = useMock;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.model.dispose();
    this.isModelLoaded = false;
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

/**
 * Reset detector instance (for testing)
 */
export function resetComponentDetector(): void {
  if (detectorInstance) {
    detectorInstance.dispose();
    detectorInstance = null;
  }
}
