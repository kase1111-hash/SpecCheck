/**
 * Camera Utilities
 */

/**
 * Generate a unique frame ID
 */
export function generateFrameId(): string {
  return `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate aspect ratio from dimensions
 */
export function getAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Scale bounding box from one resolution to another
 */
export function scaleBoundingBox(
  bbox: { x: number; y: number; width: number; height: number },
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number
): { x: number; y: number; width: number; height: number } {
  const scaleX = toWidth / fromWidth;
  const scaleY = toHeight / fromHeight;

  return {
    x: bbox.x * scaleX,
    y: bbox.y * scaleY,
    width: bbox.width * scaleX,
    height: bbox.height * scaleY,
  };
}

/**
 * Crop image data (base64) to a region
 * Note: This is a placeholder - actual implementation would use
 * expo-image-manipulator or similar
 */
export async function cropImage(
  imageBase64: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<string> {
  // TODO: Implement using expo-image-manipulator
  // For now, return the full image
  return imageBase64;
}
