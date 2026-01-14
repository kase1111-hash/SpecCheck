/**
 * TFLite Model Service
 *
 * Handles loading and running TensorFlow Lite models for
 * on-device component detection and classification.
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import type { ComponentCategory, BoundingBox } from '@speccheck/shared-types';

/**
 * Model configuration
 */
export interface ModelConfig {
  /** Model input width */
  inputWidth: number;
  /** Model input height */
  inputHeight: number;
  /** Number of input channels (3 for RGB) */
  inputChannels: number;
  /** Number of detection classes */
  numClasses: number;
  /** Detection confidence threshold */
  confidenceThreshold: number;
  /** NMS IoU threshold */
  nmsIoUThreshold: number;
  /** Maximum detections per image */
  maxDetections: number;
}

/**
 * Raw model output for a single detection
 */
export interface RawDetection {
  /** Bounding box [x, y, width, height] normalized 0-1 */
  bbox: [number, number, number, number];
  /** Class probabilities */
  classProbs: number[];
  /** Objectness score */
  objectness: number;
}

/**
 * Processed detection result
 */
export interface ProcessedDetection {
  /** Bounding box in normalized coordinates */
  bbox: BoundingBox;
  /** Detected category */
  category: ComponentCategory;
  /** Detection confidence */
  confidence: number;
  /** Category index */
  categoryIndex: number;
}

/**
 * Default model configuration
 */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  inputWidth: 320,
  inputHeight: 320,
  inputChannels: 3,
  numClasses: 13,
  confidenceThreshold: 0.5,
  nmsIoUThreshold: 0.5,
  maxDetections: 20,
};

/**
 * Category mapping from class index to ComponentCategory
 */
export const CATEGORY_MAP: ComponentCategory[] = [
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

/**
 * TensorFlow Lite Model wrapper for component detection
 */
export class TFLiteModel {
  private model: tf.GraphModel | tf.LayersModel | null = null;
  private config: ModelConfig;
  private isInitialized: boolean = false;
  private modelPath: string | null = null;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = { ...DEFAULT_MODEL_CONFIG, ...config };
  }

  /**
   * Initialize TensorFlow.js backend
   */
  async initializeTF(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Wait for TF.js to be ready
      await tf.ready();

      // Set the backend (prefer WebGL for performance)
      const backend = tf.getBackend();
      console.log(`[TFLiteModel] TF.js initialized with backend: ${backend}`);

      this.isInitialized = true;
    } catch (error) {
      console.error('[TFLiteModel] Failed to initialize TF.js:', error);
      throw new Error(`TensorFlow initialization failed: ${error}`);
    }
  }

  /**
   * Load model from bundled asset or file path
   */
  async loadModel(modelAsset?: Asset | string): Promise<void> {
    await this.initializeTF();

    try {
      if (modelAsset) {
        if (typeof modelAsset === 'string') {
          // Load from file path
          this.modelPath = modelAsset;
          this.model = await tf.loadGraphModel(`file://${modelAsset}`);
        } else {
          // Load from bundled asset
          await modelAsset.downloadAsync();
          if (modelAsset.localUri) {
            this.modelPath = modelAsset.localUri;
            this.model = await tf.loadGraphModel(`file://${modelAsset.localUri}`);
          }
        }
      }

      // If no model provided or loading failed, create a placeholder model
      if (!this.model) {
        console.log('[TFLiteModel] Creating placeholder model for development');
        this.model = await this.createPlaceholderModel();
      }

      console.log('[TFLiteModel] Model loaded successfully');
    } catch (error) {
      console.warn('[TFLiteModel] Model loading failed, using placeholder:', error);
      this.model = await this.createPlaceholderModel();
    }
  }

  /**
   * Create a placeholder model for development/testing
   * This simulates the model interface without actual weights
   */
  private async createPlaceholderModel(): Promise<tf.LayersModel> {
    const { inputWidth, inputHeight, inputChannels, numClasses } = this.config;

    // Create a simple model that outputs detection-like results
    const input = tf.input({
      shape: [inputHeight, inputWidth, inputChannels],
      name: 'input',
    });

    // Simple conv layers for feature extraction
    let x = tf.layers.conv2d({
      filters: 16,
      kernelSize: 3,
      strides: 2,
      padding: 'same',
      activation: 'relu',
    }).apply(input) as tf.SymbolicTensor;

    x = tf.layers.conv2d({
      filters: 32,
      kernelSize: 3,
      strides: 2,
      padding: 'same',
      activation: 'relu',
    }).apply(x) as tf.SymbolicTensor;

    // Global pooling
    x = tf.layers.globalAveragePooling2d({}).apply(x) as tf.SymbolicTensor;

    // Output: [batch, numClasses + 5] for each detection
    // 5 = 4 bbox coords + 1 objectness
    const output = tf.layers.dense({
      units: (numClasses + 5) * this.config.maxDetections,
      activation: 'sigmoid',
      name: 'output',
    }).apply(x) as tf.SymbolicTensor;

    const model = tf.model({ inputs: input, outputs: output });
    return model;
  }

  /**
   * Check if model is loaded and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }

  /**
   * Get model configuration
   */
  getConfig(): ModelConfig {
    return { ...this.config };
  }

  /**
   * Preprocess image tensor for model input
   */
  preprocessImage(imageTensor: tf.Tensor3D): tf.Tensor4D {
    const { inputWidth, inputHeight } = this.config;

    return tf.tidy(() => {
      // Resize to model input size
      let processed = tf.image.resizeBilinear(
        imageTensor,
        [inputHeight, inputWidth]
      );

      // Normalize to [0, 1]
      processed = processed.div(255.0);

      // Add batch dimension
      return processed.expandDims(0) as tf.Tensor4D;
    });
  }

  /**
   * Run inference on preprocessed image
   */
  async runInference(inputTensor: tf.Tensor4D): Promise<tf.Tensor> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Run prediction
    const output = this.model.predict(inputTensor) as tf.Tensor;
    return output;
  }

  /**
   * Post-process model output to extract detections
   */
  async postprocessOutput(
    output: tf.Tensor,
    originalWidth: number,
    originalHeight: number
  ): Promise<ProcessedDetection[]> {
    const { numClasses, confidenceThreshold, maxDetections } = this.config;

    const outputData = await output.data();
    const detections: ProcessedDetection[] = [];

    // Parse output format: [batch, maxDetections * (5 + numClasses)]
    // Each detection: [x, y, w, h, objectness, class1, class2, ..., classN]
    const detectionSize = 5 + numClasses;

    for (let i = 0; i < maxDetections; i++) {
      const offset = i * detectionSize;

      // Extract detection values
      const x = outputData[offset];
      const y = outputData[offset + 1];
      const w = outputData[offset + 2];
      const h = outputData[offset + 3];
      const objectness = outputData[offset + 4];

      // Extract class probabilities
      const classProbs: number[] = [];
      for (let c = 0; c < numClasses; c++) {
        classProbs.push(outputData[offset + 5 + c]);
      }

      // Find best class
      let bestClassIdx = 0;
      let bestClassProb = 0;
      for (let c = 0; c < numClasses; c++) {
        if (classProbs[c] > bestClassProb) {
          bestClassProb = classProbs[c];
          bestClassIdx = c;
        }
      }

      // Calculate final confidence
      const confidence = objectness * bestClassProb;

      // Filter by confidence threshold
      if (confidence >= confidenceThreshold) {
        detections.push({
          bbox: {
            x: x * originalWidth,
            y: y * originalHeight,
            width: w * originalWidth,
            height: h * originalHeight,
          },
          category: CATEGORY_MAP[bestClassIdx] || 'unknown',
          confidence,
          categoryIndex: bestClassIdx,
        });
      }
    }

    return detections;
  }

  /**
   * Apply Non-Maximum Suppression to filter overlapping detections
   */
  applyNMS(detections: ProcessedDetection[]): ProcessedDetection[] {
    if (detections.length === 0) return [];

    const { nmsIoUThreshold } = this.config;

    // Sort by confidence descending
    const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
    const selected: ProcessedDetection[] = [];

    while (sorted.length > 0) {
      const current = sorted.shift()!;
      selected.push(current);

      // Remove overlapping detections
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (this.calculateIoU(current.bbox, sorted[i].bbox) > nmsIoUThreshold) {
          sorted.splice(i, 1);
        }
      }
    }

    return selected;
  }

  /**
   * Calculate IoU between two bounding boxes
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
   * Full detection pipeline: preprocess -> inference -> postprocess -> NMS
   */
  async detect(
    imageTensor: tf.Tensor3D,
    originalWidth: number,
    originalHeight: number
  ): Promise<ProcessedDetection[]> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Preprocess image (synchronous, uses tidy internally)
    const input = this.preprocessImage(imageTensor);

    try {
      // Run inference (async operation)
      const output = await this.runInference(input);

      // Postprocess
      const detections = await this.postprocessOutput(
        output,
        originalWidth,
        originalHeight
      );

      // Cleanup tensors
      output.dispose();

      // Apply NMS
      return this.applyNMS(detections);
    } finally {
      // Always cleanup input tensor
      input.dispose();
    }
  }

  /**
   * Dispose of model resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
  }
}

/**
 * Singleton model instance
 */
let modelInstance: TFLiteModel | null = null;

/**
 * Get the TFLite model instance
 */
export function getTFLiteModel(): TFLiteModel {
  if (!modelInstance) {
    modelInstance = new TFLiteModel();
  }
  return modelInstance;
}

/**
 * Reset the model instance (for testing)
 */
export function resetTFLiteModel(): void {
  if (modelInstance) {
    modelInstance.dispose();
    modelInstance = null;
  }
}
