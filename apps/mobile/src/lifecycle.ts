/**
 * App Lifecycle Management
 *
 * Centralized cleanup for singleton resources (ML model, pipeline, caches).
 * Called when the app enters background to prevent memory leaks.
 */

import { resetComponentDetector } from './recognition/ComponentDetector';
import { getPipeline } from './pipeline/Pipeline';

/**
 * Release resources when the app enters background.
 * Re-initialization happens lazily on next use via singleton getters.
 */
export function cleanupResources(): void {
  try {
    resetComponentDetector();
  } catch (error) {
    console.warn('[Lifecycle] Error resetting component detector:', error);
  }

  try {
    getPipeline().reset();
  } catch (error) {
    console.warn('[Lifecycle] Error resetting pipeline:', error);
  }

  console.log('[Lifecycle] Resources cleaned up');
}
