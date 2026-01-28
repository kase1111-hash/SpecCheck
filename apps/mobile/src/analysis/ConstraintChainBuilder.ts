/**
 * ConstraintChainBuilder
 *
 * Builds constraint chains from components and evaluates claims.
 * The core analysis engine that determines what's physically possible.
 */

import type {
  Claim,
  ClaimCategory,
  ComponentWithSpecs,
  ChainLink,
  ConstraintChain,
  ConstraintType,
  VerdictResult,
  VerdictConfidence,
  SpecValue,
} from '@speccheck/shared-types';

/**
 * Configurable efficiency values by product category
 * These represent real-world conversion losses in power delivery
 */
export const EFFICIENCY_CONFIG = {
  // Power bank efficiency (battery to USB output)
  powerBank: {
    dcDcConversion: 0.90,   // DC-DC converter efficiency
    cableAndConnector: 0.98, // Cable and connector losses
    overall: 0.85,           // Conservative overall efficiency
  },
  // Charger efficiency (wall to device)
  charger: {
    acDcConversion: 0.88,   // AC-DC conversion
    pdNegotiation: 0.99,    // PD overhead
    overall: 0.87,
  },
  // Flashlight efficiency (battery to light)
  flashlight: {
    driverEfficiency: 0.92, // LED driver efficiency
    thermalDerating: 0.85,  // Thermal derating at high power
    overall: 0.78,
  },
  // Default for unknown categories
  default: 0.85,
} as const;

/**
 * LED efficiency model parameters
 * Based on typical LED behavior where efficiency decreases at higher currents
 */
const LED_EFFICIENCY_MODEL = {
  // Efficiency typically drops off above 50% of max current
  linearRegionRatio: 0.5,
  // At max current, efficiency is typically 70-85% of peak
  maxCurrentEfficiencyRatio: 0.75,
  // Minimum efficiency floor
  minimumEfficiency: 0.5,
} as const;

/**
 * Calculate LED lumens output using non-linear efficiency model
 * LEDs don't scale linearly - efficiency drops at higher currents due to droop
 */
function calculateLedLumensAtCurrent(
  targetCurrent: number,
  maxCurrent: number,
  maxLumens: number
): number {
  const currentRatio = targetCurrent / maxCurrent;

  if (currentRatio <= LED_EFFICIENCY_MODEL.linearRegionRatio) {
    // Linear region - lumens scale proportionally with current
    return (currentRatio / LED_EFFICIENCY_MODEL.linearRegionRatio) *
           (LED_EFFICIENCY_MODEL.linearRegionRatio * maxLumens);
  }

  // Non-linear region - apply efficiency droop
  // Use a quadratic model for the efficiency curve
  const linearOutput = LED_EFFICIENCY_MODEL.linearRegionRatio * maxLumens;
  const remainingRatio = (currentRatio - LED_EFFICIENCY_MODEL.linearRegionRatio) /
                         (1 - LED_EFFICIENCY_MODEL.linearRegionRatio);

  // Efficiency decreases quadratically in the high-current region
  const droopFactor = 1 - (1 - LED_EFFICIENCY_MODEL.maxCurrentEfficiencyRatio) *
                          Math.pow(remainingRatio, 1.5);

  const additionalOutput = (maxLumens - linearOutput) * remainingRatio * droopFactor;

  return Math.round(linearOutput + additionalOutput);
}

/**
 * Build a constraint chain for a claim
 */
export function buildConstraintChain(
  claim: Claim,
  components: ComponentWithSpecs[]
): ConstraintChain {
  // Get the appropriate builder for the claim category
  const builder = getChainBuilder(claim.category);
  return builder(claim, components);
}

/**
 * Get the chain builder function for a category
 */
function getChainBuilder(
  category: ClaimCategory
): (claim: Claim, components: ComponentWithSpecs[]) => ConstraintChain {
  const builders: Record<ClaimCategory, typeof buildLumensChain> = {
    lumens: buildLumensChain,
    mah: buildCapacityChain,
    wh: buildEnergyChain,
    watts: buildPowerChain,
    amps: buildCurrentChain,
    volts: buildVoltageChain,
  };

  return builders[category] || buildGenericChain;
}

/**
 * Build constraint chain for lumen claims (flashlights)
 */
function buildLumensChain(
  claim: Claim,
  components: ComponentWithSpecs[]
): ConstraintChain {
  const links: ChainLink[] = [];

  // Find LED
  const led = components.find((c) => c.specs?.category === 'led');
  if (led?.specs) {
    const lumens = led.specs.specs['luminous_flux'];
    if (lumens) {
      links.push({
        component: led,
        constraintType: 'max_output',
        maxValue: lumens.max || lumens.value,
        unit: 'lm',
        isBottleneck: false,
        explanation: `${led.specs.partNumber} LED outputs max ${lumens.max || lumens.value} lumens`,
        sourceSpec: 'luminous_flux',
      });
    }
  }

  // Find LED driver
  const driver = components.find((c) => c.specs?.category === 'led_driver');
  if (driver?.specs) {
    const maxCurrent = driver.specs.specs['max_output_current'];
    if (maxCurrent && led?.specs) {
      // Calculate lumens at driver's max current
      const ledMaxCurrent = led.specs.specs['max_current'];
      const ledMaxLumens = led.specs.specs['luminous_flux'];

      if (ledMaxCurrent && ledMaxLumens) {
        // Use non-linear LED efficiency model
        const driverLimitedLumens = calculateLedLumensAtCurrent(
          Math.min(maxCurrent.value, ledMaxCurrent.value),
          ledMaxCurrent.value,
          ledMaxLumens.max || ledMaxLumens.value
        );

        links.push({
          component: driver,
          constraintType: 'max_current',
          maxValue: driverLimitedLumens,
          unit: 'lm',
          isBottleneck: false,
          explanation: `${driver.specs.partNumber} driver @ ${maxCurrent.value}mA → ~${driverLimitedLumens} lumens (with efficiency droop)`,
          sourceSpec: 'max_output_current',
        });
      }
    }
  }

  // Find battery
  const battery = components.find((c) => c.specs?.category === 'battery_cell');
  if (battery?.specs && led?.specs) {
    const maxDischarge = battery.specs.specs['max_continuous_discharge'];
    if (maxDischarge) {
      // Calculate lumens based on battery discharge limit
      const ledVoltage = led.specs.specs['forward_voltage']?.value || 3.0;
      const availableCurrent = (maxDischarge.value * 1000) / ledVoltage; // mA

      const ledMaxCurrent = led.specs.specs['max_current'];
      const ledMaxLumens = led.specs.specs['luminous_flux'];

      if (ledMaxCurrent && ledMaxLumens) {
        // Use non-linear LED efficiency model
        const batteryLimitedLumens = calculateLedLumensAtCurrent(
          Math.min(availableCurrent, ledMaxCurrent.value),
          ledMaxCurrent.value,
          ledMaxLumens.max || ledMaxLumens.value
        );

        links.push({
          component: battery,
          constraintType: 'max_discharge',
          maxValue: batteryLimitedLumens,
          unit: 'lm',
          isBottleneck: false,
          explanation: `${battery.specs.partNumber} @ ${maxDischarge.value}A discharge → ~${batteryLimitedLumens} lumens (with efficiency droop)`,
          sourceSpec: 'max_continuous_discharge',
        });
      }
    }
  }

  return finalizeChain(claim, links);
}

/**
 * Build constraint chain for capacity claims (power banks)
 */
function buildCapacityChain(
  claim: Claim,
  components: ComponentWithSpecs[]
): ConstraintChain {
  const links: ChainLink[] = [];

  // Find all battery cells
  const batteries = components.filter((c) => c.specs?.category === 'battery_cell');

  let totalCapacity = 0;
  for (const battery of batteries) {
    if (battery.specs) {
      const capacity = battery.specs.specs['nominal_capacity'];
      if (capacity) {
        totalCapacity += capacity.value;
        links.push({
          component: battery,
          constraintType: 'max_output',
          maxValue: capacity.value,
          unit: 'mAh',
          isBottleneck: false,
          explanation: `${battery.specs.partNumber} cell: ${capacity.value}mAh`,
          sourceSpec: 'nominal_capacity',
        });
      }
    }
  }

  // Apply conversion efficiency using configurable values
  const efficiency = EFFICIENCY_CONFIG.powerBank.overall;
  const deliverableCapacity = Math.round(totalCapacity * efficiency);

  if (totalCapacity > 0) {
    links.push({
      component: batteries[0],
      constraintType: 'efficiency',
      maxValue: deliverableCapacity,
      unit: 'mAh',
      isBottleneck: false,
      explanation: `Total ${totalCapacity}mAh × ${(efficiency * 100).toFixed(0)}% efficiency (DC-DC + losses) = ${deliverableCapacity}mAh deliverable`,
      sourceSpec: 'efficiency',
    });
  }

  return finalizeChain(claim, links);
}

/**
 * Build constraint chain for energy claims
 */
function buildEnergyChain(
  claim: Claim,
  components: ComponentWithSpecs[]
): ConstraintChain {
  const links: ChainLink[] = [];

  // Find all battery cells and calculate total Wh
  const batteries = components.filter((c) => c.specs?.category === 'battery_cell');

  let totalWh = 0;
  for (const battery of batteries) {
    if (battery.specs) {
      const capacity = battery.specs.specs['nominal_capacity'];
      const voltage = battery.specs.specs['nominal_voltage'];
      if (capacity && voltage) {
        const wh = (capacity.value * voltage.value) / 1000;
        totalWh += wh;
        links.push({
          component: battery,
          constraintType: 'max_output',
          maxValue: wh,
          unit: 'Wh',
          isBottleneck: false,
          explanation: `${battery.specs.partNumber}: ${capacity.value}mAh × ${voltage.value}V = ${wh.toFixed(1)}Wh`,
          sourceSpec: 'nominal_capacity',
        });
      }
    }
  }

  return finalizeChain(claim, links);
}

/**
 * Build constraint chain for power claims (chargers)
 */
function buildPowerChain(
  claim: Claim,
  components: ComponentWithSpecs[]
): ConstraintChain {
  const links: ChainLink[] = [];

  // Find USB PD controller
  const pdController = components.find((c) => c.specs?.category === 'usb_pd');
  if (pdController?.specs) {
    const maxPower = pdController.specs.specs['max_power'];
    if (maxPower) {
      links.push({
        component: pdController,
        constraintType: 'max_output',
        maxValue: maxPower.value,
        unit: 'W',
        isBottleneck: false,
        explanation: `${pdController.specs.partNumber} PD controller: max ${maxPower.value}W`,
        sourceSpec: 'max_power',
      });
    }
  }

  // Find DC-DC converter
  const dcdc = components.find((c) => c.specs?.category === 'dc_dc');
  if (dcdc?.specs) {
    const maxCurrent = dcdc.specs.specs['max_output_current'];
    const maxVoltage = dcdc.specs.specs['max_output_voltage'];
    if (maxCurrent && maxVoltage) {
      const maxPower = maxCurrent.value * maxVoltage.value;
      links.push({
        component: dcdc,
        constraintType: 'max_output',
        maxValue: maxPower,
        unit: 'W',
        isBottleneck: false,
        explanation: `${dcdc.specs.partNumber}: ${maxCurrent.value}A × ${maxVoltage.value}V = ${maxPower}W`,
        sourceSpec: 'max_output_current',
      });
    }
  }

  return finalizeChain(claim, links);
}

/**
 * Build constraint chain for current claims
 */
function buildCurrentChain(
  claim: Claim,
  components: ComponentWithSpecs[]
): ConstraintChain {
  const links: ChainLink[] = [];

  // Find components with current limits
  for (const comp of components) {
    if (!comp.specs) continue;

    const currentSpecs = [
      'max_output_current',
      'max_current',
      'max_continuous_discharge',
    ];

    for (const specKey of currentSpecs) {
      const spec = comp.specs.specs[specKey];
      if (spec) {
        links.push({
          component: comp,
          constraintType: 'max_current',
          maxValue: spec.value,
          unit: spec.unit,
          isBottleneck: false,
          explanation: `${comp.specs.partNumber}: max ${spec.value}${spec.unit}`,
          sourceSpec: specKey,
        });
        break;
      }
    }
  }

  return finalizeChain(claim, links);
}

/**
 * Build constraint chain for voltage claims
 */
function buildVoltageChain(
  claim: Claim,
  components: ComponentWithSpecs[]
): ConstraintChain {
  const links: ChainLink[] = [];

  // Find DC-DC converter voltage limits
  const dcdc = components.find((c) => c.specs?.category === 'dc_dc');
  if (dcdc?.specs) {
    const maxVoltage = dcdc.specs.specs['max_output_voltage'];
    if (maxVoltage) {
      links.push({
        component: dcdc,
        constraintType: 'voltage_limit',
        maxValue: maxVoltage.value,
        unit: 'V',
        isBottleneck: false,
        explanation: `${dcdc.specs.partNumber} DC-DC: max ${maxVoltage.value}V output`,
        sourceSpec: 'max_output_voltage',
      });
    }
  }

  // Find USB PD controller supported voltages
  const pdController = components.find((c) => c.specs?.category === 'usb_pd');
  if (pdController?.specs) {
    const supportedVoltages = pdController.specs.specs['supported_voltages'];
    const maxCurrent = pdController.specs.specs['max_current'];
    if (supportedVoltages) {
      // Parse supported voltages (stored as comma-separated string or max value)
      const maxVoltage = typeof supportedVoltages.value === 'number'
        ? supportedVoltages.value
        : parseFloat(String(supportedVoltages.max || supportedVoltages.value));

      links.push({
        component: pdController,
        constraintType: 'voltage_limit',
        maxValue: maxVoltage,
        unit: 'V',
        isBottleneck: false,
        explanation: `${pdController.specs.partNumber} PD: supports up to ${maxVoltage}V`,
        sourceSpec: 'supported_voltages',
      });
    }
  }

  // Find battery cells - series configuration determines max voltage
  const batteries = components.filter((c) => c.specs?.category === 'battery_cell');
  if (batteries.length > 0) {
    let maxBatteryVoltage = 0;
    const voltagePerCell: number[] = [];

    for (const battery of batteries) {
      if (battery.specs) {
        const nominalVoltage = battery.specs.specs['nominal_voltage'];
        if (nominalVoltage) {
          // Assume series configuration for max voltage
          // In real scenarios, the app would detect cell configuration
          voltagePerCell.push(nominalVoltage.value);
          maxBatteryVoltage += nominalVoltage.value;
        }
      }
    }

    if (maxBatteryVoltage > 0) {
      links.push({
        component: batteries[0],
        constraintType: 'voltage_limit',
        maxValue: maxBatteryVoltage,
        unit: 'V',
        isBottleneck: false,
        explanation: `${batteries.length} cell(s) in series: max ${maxBatteryVoltage}V (${voltagePerCell.join('V + ')}V)`,
        sourceSpec: 'nominal_voltage',
      });
    }
  }

  // Find voltage regulators
  const regulators = components.filter((c) =>
    c.specs?.category === 'dc_dc' ||
    (c.specs?.specs['output_voltage'] !== undefined)
  );

  for (const regulator of regulators) {
    if (regulator.specs && regulator !== dcdc) {
      const outputVoltage = regulator.specs.specs['output_voltage'];
      if (outputVoltage) {
        links.push({
          component: regulator,
          constraintType: 'voltage_limit',
          maxValue: outputVoltage.max || outputVoltage.value,
          unit: 'V',
          isBottleneck: false,
          explanation: `${regulator.specs.partNumber}: regulated ${outputVoltage.value}V output`,
          sourceSpec: 'output_voltage',
        });
      }
    }
  }

  return finalizeChain(claim, links);
}

/**
 * Build generic chain (fallback)
 */
function buildGenericChain(
  claim: Claim,
  components: ComponentWithSpecs[]
): ConstraintChain {
  return finalizeChain(claim, []);
}

/**
 * Finalize chain: find bottleneck and determine verdict
 */
function finalizeChain(claim: Claim, links: ChainLink[]): ConstraintChain {
  if (links.length === 0) {
    return {
      claim,
      links: [],
      bottleneck: null,
      maxPossible: 0,
      unit: claim.unit,
      verdict: 'uncertain',
      confidence: 'low',
    };
  }

  // Find the minimum value (bottleneck)
  let minLink = links[0];
  for (const link of links) {
    if (link.maxValue < minLink.maxValue) {
      minLink = link;
    }
  }

  // Mark bottleneck
  minLink.isBottleneck = true;

  // Determine verdict
  const maxPossible = minLink.maxValue;
  let verdict: VerdictResult;

  if (maxPossible >= claim.value) {
    verdict = 'plausible';
  } else {
    verdict = 'impossible';
  }

  // Determine confidence based on coverage and link quality
  let confidence: VerdictConfidence;
  const highQualityLinks = links.filter(
    (link) =>
      link.component.specs !== null &&
      link.component.match.status === 'confident' &&
      link.component.match.confidence >= 0.9
  );

  if (highQualityLinks.length >= 3) {
    confidence = 'high';
  } else if (highQualityLinks.length >= 2 || links.length >= 3) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    claim,
    links,
    bottleneck: minLink,
    maxPossible,
    unit: claim.unit,
    verdict,
    confidence,
  };
}
