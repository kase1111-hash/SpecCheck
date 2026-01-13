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
 */

export { CameraView } from './CameraView';
export { useCamera } from './useCamera';
export { generateFrameId, scaleBoundingBox, cropImage } from './utils';
