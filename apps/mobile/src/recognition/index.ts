/**
 * Recognition Module
 *
 * Handles component detection, OCR, and part matching.
 *
 * Responsibilities:
 * - On-device ML inference for component detection
 * - OCR text extraction from chip markings
 * - Post-processing OCR results
 * - Matching extracted text to known components
 *
 * Exports:
 * - detectComponents: Run ML model on frame
 * - extractText: Run OCR on detected regions
 * - matchComponent: Match text to known parts
 * - ComponentDetector: Detection service class
 */

export * from './ComponentDetector';
export * from './OCREngine';
export * from './ComponentMatcher';
export * from './types';
