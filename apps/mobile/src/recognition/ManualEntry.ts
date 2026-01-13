/**
 * ManualEntry
 *
 * Allows users to manually enter component information
 * when automatic detection fails.
 */

import type {
  MatchedComponent,
  ComponentCategory,
  ComponentSpecs,
  SpecValue,
} from '@speccheck/shared-types';

/**
 * Manual entry form data
 */
export interface ManualEntryData {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  specs?: Record<string, ManualSpecEntry>;
}

/**
 * Manual spec entry
 */
export interface ManualSpecEntry {
  value: string;
  unit: string;
}

/**
 * Common component templates for quick entry
 */
export interface ComponentTemplate {
  category: ComponentCategory;
  name: string;
  specFields: SpecFieldDefinition[];
}

/**
 * Spec field definition for forms
 */
export interface SpecFieldDefinition {
  key: string;
  label: string;
  unit: string;
  placeholder: string;
  required: boolean;
}

/**
 * Templates for common component types
 */
export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    category: 'led',
    name: 'LED',
    specFields: [
      { key: 'luminous_flux', label: 'Lumens', unit: 'lm', placeholder: '1000', required: true },
      { key: 'max_current', label: 'Max Current', unit: 'mA', placeholder: '3000', required: true },
      { key: 'forward_voltage', label: 'Forward Voltage', unit: 'V', placeholder: '3.0', required: false },
    ],
  },
  {
    category: 'led_driver',
    name: 'LED Driver',
    specFields: [
      { key: 'max_output_current', label: 'Max Output Current', unit: 'mA', placeholder: '1200', required: true },
      { key: 'input_voltage_max', label: 'Max Input Voltage', unit: 'V', placeholder: '30', required: false },
      { key: 'efficiency', label: 'Efficiency', unit: '%', placeholder: '95', required: false },
    ],
  },
  {
    category: 'battery_cell',
    name: 'Battery Cell',
    specFields: [
      { key: 'nominal_capacity', label: 'Capacity', unit: 'mAh', placeholder: '3500', required: true },
      { key: 'nominal_voltage', label: 'Nominal Voltage', unit: 'V', placeholder: '3.6', required: true },
      { key: 'max_continuous_discharge', label: 'Max Discharge', unit: 'A', placeholder: '10', required: true },
    ],
  },
  {
    category: 'usb_pd',
    name: 'USB PD Controller',
    specFields: [
      { key: 'max_power', label: 'Max Power', unit: 'W', placeholder: '65', required: true },
      { key: 'max_current', label: 'Max Current', unit: 'A', placeholder: '3', required: false },
    ],
  },
  {
    category: 'audio_amp',
    name: 'Audio Amplifier',
    specFields: [
      { key: 'output_power', label: 'Output Power', unit: 'W', placeholder: '20', required: true },
      { key: 'load_impedance', label: 'Load Impedance', unit: 'Ω', placeholder: '8', required: false },
    ],
  },
];

/**
 * Get template for a category
 */
export function getTemplate(category: ComponentCategory): ComponentTemplate | undefined {
  return COMPONENT_TEMPLATES.find((t) => t.category === category);
}

/**
 * Convert manual entry to MatchedComponent
 */
export function manualEntryToMatch(
  entry: ManualEntryData,
  regionId: string = 'manual'
): MatchedComponent {
  return {
    regionId,
    status: 'confident',
    partNumber: entry.partNumber || 'MANUAL',
    manufacturer: entry.manufacturer || 'Unknown',
    category: entry.category,
    confidence: 1.0, // User-provided = full confidence
    datasheetId: null,
    alternatives: [],
  };
}

/**
 * Convert manual entry to ComponentSpecs
 */
export function manualEntryToSpecs(entry: ManualEntryData): ComponentSpecs {
  const specs: Record<string, SpecValue> = {};

  if (entry.specs) {
    for (const [key, spec] of Object.entries(entry.specs)) {
      const value = parseFloat(spec.value);
      if (!isNaN(value)) {
        specs[key] = {
          value,
          unit: spec.unit,
          conditions: 'manual entry',
          min: null,
          max: null,
          typical: null,
        };
      }
    }
  }

  return {
    partNumber: entry.partNumber || 'MANUAL',
    manufacturer: entry.manufacturer || 'Unknown',
    category: entry.category,
    source: 'manual',
    specs,
    datasheetUrl: null,
    lastUpdated: Date.now(),
  };
}

/**
 * Validate manual entry
 */
export function validateManualEntry(
  entry: ManualEntryData
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entry.category) {
    errors.push('Please select a component category');
  }

  const template = getTemplate(entry.category);
  if (template) {
    for (const field of template.specFields) {
      if (field.required) {
        const value = entry.specs?.[field.key]?.value;
        if (!value || value.trim() === '') {
          errors.push(`${field.label} is required`);
        } else if (isNaN(parseFloat(value))) {
          errors.push(`${field.label} must be a number`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge manual entries with detected components
 */
export function mergeWithManualEntries(
  detected: MatchedComponent[],
  manual: ManualEntryData[]
): MatchedComponent[] {
  const manualMatches = manual.map((entry, index) =>
    manualEntryToMatch(entry, `manual_${index}`)
  );

  return [...detected, ...manualMatches];
}
