/**
 * Recognition Module
 *
 * Handles component detection, OCR, and part matching.
 *
 * Responsibilities:
 * - On-device ML inference for component detection (TFLite)
 * - OCR text extraction from chip markings
 * - Post-processing OCR results
 * - Matching extracted text to known components
 *
 * Exports:
 * - ComponentDetector: Detection service class (TFLite integration)
 * - TFLiteModel: Low-level TFLite model wrapper
 * - ImagePreprocessor: Image preprocessing utilities
 * - OCREngine: Text extraction service
 * - ComponentMatcher: Part number matching
 */

export * from './ComponentDetector';
export * from './TFLiteModel';
export * from './ImagePreprocessor';
export * from './OCREngine';
export * from './ComponentMatcher';
export * from './types';
