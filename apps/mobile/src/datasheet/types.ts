/**
 * Datasheet module types
 */

import type { ComponentCategory } from '../recognition/types';

export interface SpecValue {
  /** Numeric value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Test conditions (e.g., "at 25°C") */
  conditions: string | null;
  /** Minimum value if range */
  min: number | null;
  /** Maximum value if range */
  max: number | null;
  /** Typical value */
  typical: number | null;
}

export interface ComponentSpecs {
  /** Part number */
  partNumber: string;
  /** Manufacturer name */
  manufacturer: string;
  /** Component category */
  category: ComponentCategory;
  /** Data source */
  source: 'cache' | 'api' | 'llm';
  /** Key specifications */
  specs: Record<string, SpecValue>;
}

/**
 * Category-specific spec keys
 */
export type LEDSpecs = {
  luminousFlux: SpecValue;
  forwardVoltage: SpecValue;
  maxCurrent: SpecValue;
  thermalResistance: SpecValue;
};

export type LEDDriverSpecs = {
  maxOutputCurrent: SpecValue;
  inputVoltageRange: SpecValue;
  efficiency: SpecValue;
  switchingFrequency: SpecValue;
};

export type BatteryCellSpecs = {
  nominalCapacity: SpecValue;
  nominalVoltage: SpecValue;
  maxContinuousDischarge: SpecValue;
  maxPulseDischarge: SpecValue;
  internalResistance: SpecValue;
};

export type USBPDSpecs = {
  maxPower: SpecValue;
  supportedVoltages: SpecValue;
  maxCurrentPerVoltage: SpecValue;
};

export interface DatasheetCacheEntry {
  partNumber: string;
  manufacturer: string;
  category: string;
  specsJson: string;
  fetchedAt: number;
  expiresAt: number;
}
