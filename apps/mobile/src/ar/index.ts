/**
 * AR Module
 *
 * Handles augmented reality overlay rendering.
 *
 * Responsibilities:
 * - Render bounding boxes over detected components
 * - Display component labels and spec cards
 * - Track component positions as camera moves
 * - Manage overlay state (selected, expanded, etc.)
 *
 * Exports:
 * - AROverlay: Main overlay component
 * - ComponentMarker: Individual component highlight
 * - SpecCard: Floating specification display
 * - useOverlayState: Hook for overlay management
 */

export * from './AROverlay';
export * from './ComponentMarker';
export * from './SpecCard';
export * from './useOverlayState';
export * from './types';
