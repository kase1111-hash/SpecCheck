/**
 * OfflineMode
 *
 * Handles offline functionality with graceful degradation.
 */

import type { ComponentSpecs, ComponentCategory } from '@speccheck/shared-types';
import { getDatasheetCache } from './DatasheetCache';
import { isOnline } from '../utils/network';

/**
 * Offline mode state
 */
export interface OfflineState {
  isOffline: boolean;
  cachedComponentCount: number;
  lastSyncTime: number | null;
  pendingUploads: number;
}

/**
 * Get current offline state
 */
export async function getOfflineState(): Promise<OfflineState> {
  const cache = getDatasheetCache();

  return {
    isOffline: !isOnline(),
    cachedComponentCount: 0, // TODO: Get from SQLite
    lastSyncTime: null, // TODO: Get from storage
    pendingUploads: 0, // TODO: Get from queue
  };
}

/**
 * Bundled component data for offline use
 * These are the most common components that work without network
 */
export const BUNDLED_COMPONENTS: ComponentSpecs[] = [
  // Popular LEDs
  {
    partNumber: 'XM-L2',
    manufacturer: 'Cree',
    category: 'led',
    source: 'cache',
    specs: {
      luminous_flux: { value: 1052, unit: 'lm', conditions: 'at 3000mA', min: 900, max: 1100, typical: 1052 },
      max_current: { value: 3000, unit: 'mA', conditions: null, min: null, max: 3000, typical: null },
      forward_voltage: { value: 3.1, unit: 'V', conditions: 'at 3000mA', min: 2.9, max: 3.5, typical: 3.1 },
    },
    datasheetUrl: null,
    lastUpdated: Date.now(),
  },
  {
    partNumber: 'XP-G3',
    manufacturer: 'Cree',
    category: 'led',
    source: 'cache',
    specs: {
      luminous_flux: { value: 777, unit: 'lm', conditions: 'at 2000mA', min: 700, max: 850, typical: 777 },
      max_current: { value: 2000, unit: 'mA', conditions: null, min: null, max: 2000, typical: null },
      forward_voltage: { value: 3.0, unit: 'V', conditions: 'at 2000mA', min: 2.7, max: 3.3, typical: 3.0 },
    },
    datasheetUrl: null,
    lastUpdated: Date.now(),
  },
  {
    partNumber: 'SST-40',
    manufacturer: 'Luminus',
    category: 'led',
    source: 'cache',
    specs: {
      luminous_flux: { value: 1800, unit: 'lm', conditions: 'at 5000mA', min: 1600, max: 2000, typical: 1800 },
      max_current: { value: 5000, unit: 'mA', conditions: null, min: null, max: 5000, typical: null },
      forward_voltage: { value: 3.15, unit: 'V', conditions: 'at 5000mA', min: 2.9, max: 3.4, typical: 3.15 },
    },
    datasheetUrl: null,
    lastUpdated: Date.now(),
  },

  // Popular LED drivers
  {
    partNumber: 'PT4115',
    manufacturer: 'PowTech',
    category: 'led_driver',
    source: 'cache',
    specs: {
      max_output_current: { value: 1200, unit: 'mA', conditions: null, min: null, max: 1200, typical: null },
      input_voltage_min: { value: 6, unit: 'V', conditions: null, min: 6, max: null, typical: null },
      input_voltage_max: { value: 30, unit: 'V', conditions: null, min: null, max: 30, typical: null },
      efficiency: { value: 97, unit: '%', conditions: null, min: null, max: null, typical: 97 },
    },
    datasheetUrl: null,
    lastUpdated: Date.now(),
  },
  {
    partNumber: 'TP4056',
    manufacturer: 'NanJing Top Power',
    category: 'bms',
    source: 'cache',
    specs: {
      max_output_current: { value: 1000, unit: 'mA', conditions: null, min: null, max: 1000, typical: null },
      input_voltage_max: { value: 8, unit: 'V', conditions: null, min: null, max: 8, typical: null },
    },
    datasheetUrl: null,
    lastUpdated: Date.now(),
  },

  // Popular battery cells
  {
    partNumber: 'INR18650-35E',
    manufacturer: 'Samsung SDI',
    category: 'battery_cell',
    source: 'cache',
    specs: {
      nominal_capacity: { value: 3500, unit: 'mAh', conditions: null, min: 3350, max: null, typical: 3500 },
      nominal_voltage: { value: 3.6, unit: 'V', conditions: null, min: null, max: null, typical: 3.6 },
      max_continuous_discharge: { value: 8, unit: 'A', conditions: null, min: null, max: 8, typical: null },
      internal_resistance: { value: 25, unit: 'mΩ', conditions: null, min: null, max: null, typical: 25 },
    },
    datasheetUrl: null,
    lastUpdated: Date.now(),
  },
  {
    partNumber: 'NCR18650B',
    manufacturer: 'Panasonic',
    category: 'battery_cell',
    source: 'cache',
    specs: {
      nominal_capacity: { value: 3400, unit: 'mAh', conditions: null, min: 3250, max: null, typical: 3400 },
      nominal_voltage: { value: 3.6, unit: 'V', conditions: null, min: null, max: null, typical: 3.6 },
      max_continuous_discharge: { value: 4.9, unit: 'A', conditions: null, min: null, max: 4.9, typical: null },
      internal_resistance: { value: 35, unit: 'mΩ', conditions: null, min: null, max: null, typical: 35 },
    },
    datasheetUrl: null,
    lastUpdated: Date.now(),
  },
  {
    partNumber: 'INR21700-50E',
    manufacturer: 'Samsung SDI',
    category: 'battery_cell',
    source: 'cache',
    specs: {
      nominal_capacity: { value: 5000, unit: 'mAh', conditions: null, min: 4850, max: null, typical: 5000 },
      nominal_voltage: { value: 3.6, unit: 'V', conditions: null, min: null, max: null, typical: 3.6 },
      max_continuous_discharge: { value: 9.8, unit: 'A', conditions: null, min: null, max: 9.8, typical: null },
      internal_resistance: { value: 20, unit: 'mΩ', conditions: null, min: null, max: null, typical: 20 },
    },
    datasheetUrl: null,
    lastUpdated: Date.now(),
  },
];

/**
 * Lookup component in bundled data
 */
export function getBundledComponent(partNumber: string): ComponentSpecs | null {
  const normalized = partNumber.toUpperCase().replace(/[\s-]/g, '');

  for (const component of BUNDLED_COMPONENTS) {
    const bundledNormalized = component.partNumber.toUpperCase().replace(/[\s-]/g, '');
    if (bundledNormalized === normalized) {
      return component;
    }
  }

  return null;
}

/**
 * Get offline-capable categories
 * These categories have enough bundled data to work offline
 */
export function getOfflineCategories(): ComponentCategory[] {
  const categories = new Set<ComponentCategory>();

  for (const component of BUNDLED_COMPONENTS) {
    categories.add(component.category);
  }

  return Array.from(categories);
}

/**
 * Check if a category has offline support
 */
export function hasOfflineSupport(category: ComponentCategory): boolean {
  return getOfflineCategories().includes(category);
}

/**
 * Get offline notice message
 */
export function getOfflineNotice(): string {
  if (isOnline()) {
    return '';
  }

  const categories = getOfflineCategories();
  return `Offline mode: Limited to ${categories.length} component types (${categories.join(', ')})`;
}
