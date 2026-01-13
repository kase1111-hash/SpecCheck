/**
 * Camera module types
 */

export interface CameraFrame {
  /** Raw image data as base64 or Uint8Array */
  image: string;
  /** Frame width in pixels */
  width: number;
  /** Frame height in pixels */
  height: number;
  /** Capture timestamp */
  timestamp: number;
  /** Device orientation (0, 90, 180, 270) */
  orientation: number;
}

export interface CameraConfig {
  /** Resolution for preview stream */
  previewResolution: 'low' | 'medium' | 'high';
  /** Enable torch/flashlight */
  torch: boolean;
  /** Camera facing direction */
  facing: 'front' | 'back';
}

export interface CameraState {
  /** Camera is ready and streaming */
  isReady: boolean;
  /** Camera permission status */
  permission: 'undetermined' | 'granted' | 'denied';
  /** Current camera configuration */
  config: CameraConfig;
}
