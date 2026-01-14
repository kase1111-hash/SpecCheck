/**
 * ImagePreprocessor
 *
 * Utilities for preprocessing images before ML inference.
 * Handles resizing, normalization, and tensor conversion.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as tf from '@tensorflow/tfjs';
import { decode as decodeJpeg } from 'jpeg-js';
import { Buffer } from 'buffer';
import type { BoundingBox } from '@speccheck/shared-types';

/**
 * Image preprocessing options
 */
export interface PreprocessOptions {
  /** Target width for resizing */
  targetWidth: number;
  /** Target height for resizing */
  targetHeight: number;
  /** Whether to normalize pixel values to [0, 1] */
  normalize: boolean;
  /** Whether to maintain aspect ratio (adds padding) */
  maintainAspectRatio: boolean;
  /** Padding color if maintaining aspect ratio (RGB values) */
  paddingColor?: [number, number, number];
}

/**
 * Default preprocessing options for component detection model
 */
export const DEFAULT_PREPROCESS_OPTIONS: PreprocessOptions = {
  targetWidth: 320,
  targetHeight: 320,
  normalize: true,
  maintainAspectRatio: true,
  paddingColor: [128, 128, 128], // Gray padding
};

/**
 * Preprocessed image result
 */
export interface PreprocessedImage {
  /** Image tensor ready for inference */
  tensor: tf.Tensor3D;
  /** Original image width */
  originalWidth: number;
  /** Original image height */
  originalHeight: number;
  /** Scale factor applied (for coordinate mapping) */
  scale: number;
  /** X offset if letterboxed */
  offsetX: number;
  /** Y offset if letterboxed */
  offsetY: number;
}

/**
 * Decode base64 image to raw pixel data
 */
export async function decodeBase64Image(
  base64: string
): Promise<{ data: Uint8Array; width: number; height: number }> {
  // Remove data URI prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  try {
    // Decode JPEG
    const rawData = decodeJpeg(buffer as any, { useTArray: true });
    return {
      data: new Uint8Array(rawData.data),
      width: rawData.width,
      height: rawData.height,
    };
  } catch (error) {
    throw new Error(`Failed to decode image: ${error}`);
  }
}

/**
 * Convert raw RGBA pixel data to RGB tensor
 */
export function pixelDataToTensor(
  data: Uint8Array,
  width: number,
  height: number
): tf.Tensor3D {
  return tf.tidy(() => {
    // Create RGBA tensor
    const rgbaTensor = tf.tensor3d(data, [height, width, 4], 'int32');

    // Extract RGB channels (drop alpha)
    const rgbTensor = rgbaTensor.slice([0, 0, 0], [-1, -1, 3]);

    // Cast to float32 for processing
    return rgbTensor.cast('float32') as tf.Tensor3D;
  });
}

/**
 * Resize image tensor to target dimensions
 */
export function resizeImage(
  imageTensor: tf.Tensor3D,
  targetWidth: number,
  targetHeight: number,
  maintainAspectRatio: boolean = true
): tf.Tensor3D {
  return tf.tidy(() => {
    if (!maintainAspectRatio) {
      // Simple resize to exact dimensions
      return tf.image.resizeBilinear(imageTensor, [targetHeight, targetWidth]);
    }

    // Calculate scaling to maintain aspect ratio
    const [height, width] = imageTensor.shape;
    const scale = Math.min(targetWidth / width, targetHeight / height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    // Resize
    const resized = tf.image.resizeBilinear(imageTensor, [newHeight, newWidth]);

    // Calculate padding
    const padTop = Math.floor((targetHeight - newHeight) / 2);
    const padBottom = targetHeight - newHeight - padTop;
    const padLeft = Math.floor((targetWidth - newWidth) / 2);
    const padRight = targetWidth - newWidth - padLeft;

    // Apply padding
    const padded = tf.pad(resized, [
      [padTop, padBottom],
      [padLeft, padRight],
      [0, 0],
    ], 128); // Gray padding

    return padded as tf.Tensor3D;
  });
}

/**
 * Normalize tensor values to [0, 1] range
 */
export function normalizeImage(imageTensor: tf.Tensor3D): tf.Tensor3D {
  return tf.tidy(() => {
    return imageTensor.div(255.0) as tf.Tensor3D;
  });
}

/**
 * Full preprocessing pipeline for an image
 */
export async function preprocessImage(
  base64: string,
  options: Partial<PreprocessOptions> = {}
): Promise<PreprocessedImage> {
  const opts = { ...DEFAULT_PREPROCESS_OPTIONS, ...options };

  // Decode image
  const decoded = await decodeBase64Image(base64);

  // Convert to tensor
  let tensor = pixelDataToTensor(decoded.data, decoded.width, decoded.height);

  // Calculate scale and offset for coordinate mapping
  const scale = Math.min(
    opts.targetWidth / decoded.width,
    opts.targetHeight / decoded.height
  );
  const newWidth = Math.round(decoded.width * scale);
  const newHeight = Math.round(decoded.height * scale);
  const offsetX = Math.floor((opts.targetWidth - newWidth) / 2);
  const offsetY = Math.floor((opts.targetHeight - newHeight) / 2);

  // Resize
  tensor = resizeImage(
    tensor,
    opts.targetWidth,
    opts.targetHeight,
    opts.maintainAspectRatio
  );

  // Normalize if requested
  if (opts.normalize) {
    tensor = normalizeImage(tensor);
  }

  return {
    tensor,
    originalWidth: decoded.width,
    originalHeight: decoded.height,
    scale,
    offsetX,
    offsetY,
  };
}

/**
 * Map detection coordinates from model space back to original image space
 */
export function mapCoordinatesToOriginal(
  bbox: BoundingBox,
  preprocessInfo: PreprocessedImage,
  _modelInputSize: number
): BoundingBox {
  const { scale, offsetX, offsetY, originalWidth, originalHeight } = preprocessInfo;

  // Remove offset (letterboxing)
  const x = (bbox.x - offsetX) / scale;
  const y = (bbox.y - offsetY) / scale;
  const width = bbox.width / scale;
  const height = bbox.height / scale;

  // Clamp to original image bounds
  return {
    x: Math.max(0, Math.min(x, originalWidth)),
    y: Math.max(0, Math.min(y, originalHeight)),
    width: Math.min(width, originalWidth - x),
    height: Math.min(height, originalHeight - y),
  };
}

/**
 * Crop region from base64 image using expo-image-manipulator
 */
export async function cropImageRegion(
  imageUri: string,
  region: BoundingBox
): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: Math.round(region.x),
            originY: Math.round(region.y),
            width: Math.round(region.width),
            height: Math.round(region.height),
          },
        },
      ],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    return result.base64 || '';
  } catch (error) {
    console.error('[ImagePreprocessor] Crop failed:', error);
    throw error;
  }
}

/**
 * Resize image using expo-image-manipulator
 */
export async function resizeImageFile(
  imageUri: string,
  width: number,
  height: number
): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width, height } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    return result.base64 || '';
  } catch (error) {
    console.error('[ImagePreprocessor] Resize failed:', error);
    throw error;
  }
}

/**
 * Convert base64 to file URI for image manipulation
 */
export async function base64ToFileUri(
  base64: string,
  filename: string = 'temp_image.jpg'
): Promise<string> {
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  // Remove data URI prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');

  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return fileUri;
}

/**
 * Read file as base64
 */
export async function fileUriToBase64(fileUri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Calculate image dimensions from base64 without decoding full image
 * Note: This is a quick estimate, actual dimensions may vary
 */
export function estimateImageDimensions(
  base64: string
): { width: number; height: number } | null {
  try {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // JPEG SOF0/SOF2 markers contain dimensions
    for (let i = 0; i < buffer.length - 8; i++) {
      if (buffer[i] === 0xff && (buffer[i + 1] === 0xc0 || buffer[i + 1] === 0xc2)) {
        const height = (buffer[i + 5] << 8) | buffer[i + 6];
        const width = (buffer[i + 7] << 8) | buffer[i + 8];
        return { width, height };
      }
    }

    return null;
  } catch {
    return null;
  }
}
