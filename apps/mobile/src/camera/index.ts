/**
 * Camera Module
 *
 * Handles camera access, frame capture, and image preprocessing.
 *
 * Responsibilities:
 * - Camera permission management
 * - Live preview stream
 * - Frame capture for ML processing
 * - Full resolution capture on user tap
 * - Orientation handling
 *
 * Exports:
 * - CameraView: Main camera component
 * - useCamera: Hook for camera controls
 * - captureFrame: Capture current frame for processing
 * - captureFullRes: Capture full resolution image
 */

export * from './CameraView';
export * from './useCamera';
export * from './captureFrame';
export * from './types';
