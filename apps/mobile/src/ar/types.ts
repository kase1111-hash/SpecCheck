/**
 * AR module types
 */

import type { MatchedComponent } from '../recognition/types';
import type { ConstraintChain, Verdict } from '../analysis/types';

export interface Point {
  x: number;
  y: number;
}

export interface ComponentAnchor {
  /** Reference to component */
  componentId: string;
  /** Current screen position */
  screenPosition: Point;
  /** Tracking status */
  trackingStatus: 'tracking' | 'lost' | 'static';
}

export interface OverlayState {
  /** Active component anchors */
  anchors: ComponentAnchor[];
  /** Currently selected component ID */
  selectedComponent: string | null;
  /** Components with expanded spec cards */
  expandedCards: string[];
  /** Active constraint chain visualization */
  constraintChain: ConstraintChain | null;
  /** Current verdict display */
  verdict: Verdict | null;
}

export type MarkerColor = 'green' | 'yellow' | 'blue' | 'red';

export interface MarkerStyle {
  /** Border color based on status */
  color: MarkerColor;
  /** Show label */
  showLabel: boolean;
  /** Pulsing animation */
  pulsing: boolean;
}
