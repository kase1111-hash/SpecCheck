/**
 * ConstraintChainBuilder Tests
 *
 * Tests for the core constraint chain building logic.
 */

import {
  buildConstraintChain,
  EFFICIENCY_CONFIG,
} from '../src/analysis/ConstraintChainBuilder';
import type {
  Claim,
  ComponentWithSpecs,
  ComponentSpecs,
  MatchedComponent,
  ConstraintChain,
  ClaimCategory,
} from '@speccheck/shared-types';

// Helper to create a mock claim
const createMockClaim = (overrides?: Partial<Claim>): Claim => ({
  category: 'lumens',
  value: 10000,
  unit: 'lm',
  source: 'user_input',
  originalText: '10000 lumens',
  ...overrides,
});

// Helper to create a mock matched component
const createMockMatch = (overrides?: Partial<MatchedComponent>): MatchedComponent => ({
  regionId: 'region_1',
  status: 'confident',
  partNumber: 'TEST-001',
  manufacturer: 'Test Manufacturer',
  category: 'led',
  confidence: 0.95,
  datasheetId: 'test_001',
  alternatives: [],
  ...overrides,
});

// Helper to create mock component specs
const createMockSpecs = (overrides?: Partial<ComponentSpecs>): ComponentSpecs => ({
  partNumber: 'TEST-001',
  manufacturer: 'Test Manufacturer',
  category: 'led',
  source: 'cache',
  specs: {},
  datasheetUrl: null,
  lastUpdated: Date.now(),
  ...overrides,
});

// Helper to create a full component with specs
const createMockComponent = (
  matchOverrides?: Partial<MatchedComponent>,
  specsOverrides?: Partial<ComponentSpecs>
): ComponentWithSpecs => ({
  match: createMockMatch(matchOverrides),
  specs: createMockSpecs(specsOverrides),
  error: null,
});

// Create LED component with common specs
const createLedComponent = (lumens: number, maxCurrent: number): ComponentWithSpecs => ({
  match: createMockMatch({
    partNumber: 'XM-L2',
    manufacturer: 'Cree',
    category: 'led',
  }),
  specs: createMockSpecs({
    partNumber: 'XM-L2',
    manufacturer: 'Cree',
    category: 'led',
    specs: {
      luminous_flux: {
        value: lumens,
        unit: 'lm',
        conditions: 'at max current',
        min: null,
        max: lumens,
        typical: lumens,
      },
      max_current: {
        value: maxCurrent,
        unit: 'mA',
        conditions: null,
        min: null,
        max: maxCurrent,
        typical: null,
      },
      forward_voltage: {
        value: 3.1,
        unit: 'V',
        conditions: null,
        min: null,
        max: null,
        typical: 3.1,
      },
    },
  }),
  error: null,
});

// Create LED driver component
const createDriverComponent = (maxCurrent: number): ComponentWithSpecs => ({
  match: createMockMatch({
    partNumber: 'PT4115',
    manufacturer: 'PowTech',
    category: 'led_driver',
  }),
  specs: createMockSpecs({
    partNumber: 'PT4115',
    manufacturer: 'PowTech',
    category: 'led_driver',
    specs: {
      max_output_current: {
        value: maxCurrent,
        unit: 'mA',
        conditions: null,
        min: null,
        max: maxCurrent,
        typical: null,
      },
    },
  }),
  error: null,
});

// Create battery component
const createBatteryComponent = (
  capacity: number,
  voltage: number,
  maxDischarge: number
): ComponentWithSpecs => ({
  match: createMockMatch({
    partNumber: 'INR18650-35E',
    manufacturer: 'Samsung SDI',
    category: 'battery_cell',
  }),
  specs: createMockSpecs({
    partNumber: 'INR18650-35E',
    manufacturer: 'Samsung SDI',
    category: 'battery_cell',
    specs: {
      nominal_capacity: {
        value: capacity,
        unit: 'mAh',
        conditions: null,
        min: null,
        max: null,
        typical: capacity,
      },
      nominal_voltage: {
        value: voltage,
        unit: 'V',
        conditions: null,
        min: null,
        max: null,
        typical: voltage,
      },
      max_continuous_discharge: {
        value: maxDischarge,
        unit: 'A',
        conditions: null,
        min: null,
        max: maxDischarge,
        typical: null,
      },
    },
  }),
  error: null,
});

// Create USB PD controller component
const createPdController = (maxPower: number, maxVoltage: number): ComponentWithSpecs => ({
  match: createMockMatch({
    partNumber: 'IP2312',
    manufacturer: 'Injoinic',
    category: 'usb_pd',
  }),
  specs: createMockSpecs({
    partNumber: 'IP2312',
    manufacturer: 'Injoinic',
    category: 'usb_pd',
    specs: {
      max_power: {
        value: maxPower,
        unit: 'W',
        conditions: null,
        min: null,
        max: maxPower,
        typical: null,
      },
      supported_voltages: {
        value: maxVoltage,
        unit: 'V',
        conditions: 'max',
        min: 5,
        max: maxVoltage,
        typical: null,
      },
    },
  }),
  error: null,
});

// Create DC-DC converter component
const createDcdcConverter = (
  maxCurrent: number,
  maxVoltage: number
): ComponentWithSpecs => ({
  match: createMockMatch({
    partNumber: 'LM2596',
    manufacturer: 'Texas Instruments',
    category: 'dc_dc',
  }),
  specs: createMockSpecs({
    partNumber: 'LM2596',
    manufacturer: 'Texas Instruments',
    category: 'dc_dc',
    specs: {
      max_output_current: {
        value: maxCurrent,
        unit: 'A',
        conditions: null,
        min: null,
        max: maxCurrent,
        typical: null,
      },
      max_output_voltage: {
        value: maxVoltage,
        unit: 'V',
        conditions: null,
        min: null,
        max: maxVoltage,
        typical: null,
      },
    },
  }),
  error: null,
});

describe('ConstraintChainBuilder', () => {
  describe('buildConstraintChain', () => {
    it('returns uncertain when no components provided', () => {
      const claim = createMockClaim();
      const chain = buildConstraintChain(claim, []);

      expect(chain.verdict).toBe('uncertain');
      expect(chain.confidence).toBe('low');
      expect(chain.links).toHaveLength(0);
    });

    it('returns uncertain when components have no specs', () => {
      const claim = createMockClaim();
      const component: ComponentWithSpecs = {
        match: createMockMatch(),
        specs: null,
        error: 'No datasheet found',
      };

      const chain = buildConstraintChain(claim, [component]);

      expect(chain.verdict).toBe('uncertain');
      expect(chain.confidence).toBe('low');
    });
  });

  describe('Lumens Chain (Flashlights)', () => {
    it('builds chain with LED output limit', () => {
      const claim = createMockClaim({ value: 1000, category: 'lumens' });
      const led = createLedComponent(1052, 3000);

      const chain = buildConstraintChain(claim, [led]);

      expect(chain.links.length).toBeGreaterThan(0);
      expect(chain.verdict).toBe('plausible');
      expect(chain.maxPossible).toBe(1052);
    });

    it('identifies LED as bottleneck when driver can deliver more', () => {
      const claim = createMockClaim({ value: 2000, category: 'lumens' });
      const led = createLedComponent(1052, 3000);
      const driver = createDriverComponent(5000); // Driver can deliver more than LED needs

      const chain = buildConstraintChain(claim, [led, driver]);

      expect(chain.verdict).toBe('impossible');
      expect(chain.bottleneck).toBeDefined();
      // The LED should be the bottleneck since it maxes out at 1052 lm
    });

    it('identifies driver as bottleneck when it limits current', () => {
      const claim = createMockClaim({ value: 1000, category: 'lumens' });
      const led = createLedComponent(1052, 3000);
      const driver = createDriverComponent(1500); // Only 50% of LED max current

      const chain = buildConstraintChain(claim, [led, driver]);

      // Driver at 1500mA vs LED max 3000mA = 50% current
      // With non-linear model, this will be less than 526 lumens
      const driverLink = chain.links.find(
        (l) => l.component.specs?.category === 'led_driver'
      );

      expect(driverLink).toBeDefined();
      expect(driverLink?.maxValue).toBeLessThan(1052); // Non-linear efficiency
    });

    it('applies non-linear LED efficiency model', () => {
      const claim = createMockClaim({ value: 1000, category: 'lumens' });
      const led = createLedComponent(1000, 3000);
      const driver = createDriverComponent(3000); // Full current

      const chain = buildConstraintChain(claim, [led, driver]);

      // At full current, efficiency droop should reduce output
      const driverLink = chain.links.find(
        (l) => l.component.specs?.category === 'led_driver'
      );

      // With 75% efficiency at max current, expect ~750lm
      expect(driverLink?.maxValue).toBeLessThan(1000);
    });

    it('considers battery discharge limit', () => {
      const claim = createMockClaim({ value: 800, category: 'lumens' });
      const led = createLedComponent(1052, 3000);
      const battery = createBatteryComponent(3500, 3.6, 8); // 8A discharge

      const chain = buildConstraintChain(claim, [led, battery]);

      const batteryLink = chain.links.find(
        (l) => l.component.specs?.category === 'battery_cell'
      );

      expect(batteryLink).toBeDefined();
      expect(batteryLink?.constraintType).toBe('max_discharge');
    });

    it('marks claim as plausible when within limits', () => {
      const claim = createMockClaim({ value: 500, category: 'lumens' });
      const led = createLedComponent(1052, 3000);

      const chain = buildConstraintChain(claim, [led]);

      expect(chain.verdict).toBe('plausible');
      expect(chain.maxPossible).toBeGreaterThanOrEqual(claim.value);
    });

    it('marks claim as impossible when exceeding limits', () => {
      const claim = createMockClaim({ value: 2000, category: 'lumens' });
      const led = createLedComponent(1052, 3000);

      const chain = buildConstraintChain(claim, [led]);

      expect(chain.verdict).toBe('impossible');
      expect(chain.maxPossible).toBeLessThan(claim.value);
    });
  });

  describe('Capacity Chain (Power Banks)', () => {
    it('sums capacity from multiple batteries', () => {
      const claim = createMockClaim({
        value: 10000,
        category: 'mah',
        unit: 'mAh',
      });
      const battery1 = createBatteryComponent(3500, 3.6, 8);
      const battery2 = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [battery1, battery2]);

      // Total = 7000mAh, with efficiency = 5950mAh
      const efficiencyLink = chain.links.find(
        (l) => l.constraintType === 'efficiency'
      );

      expect(efficiencyLink).toBeDefined();
      expect(chain.verdict).toBe('impossible'); // 10000 > 5950
    });

    it('applies configurable efficiency value', () => {
      const claim = createMockClaim({
        value: 3000,
        category: 'mah',
        unit: 'mAh',
      });
      const battery = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [battery]);

      // Expected: 3500 * 0.85 = 2975mAh
      const expectedMax = Math.round(3500 * EFFICIENCY_CONFIG.powerBank.overall);
      expect(chain.maxPossible).toBe(expectedMax);
      expect(chain.verdict).toBe('impossible'); // 3000 > 2975
    });

    it('marks plausible when claim is within deliverable capacity', () => {
      const claim = createMockClaim({
        value: 2500,
        category: 'mah',
        unit: 'mAh',
      });
      const battery = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [battery]);

      expect(chain.verdict).toBe('plausible');
    });
  });

  describe('Energy Chain (Wh)', () => {
    it('calculates Wh from battery specs', () => {
      const claim = createMockClaim({
        value: 10,
        category: 'wh',
        unit: 'Wh',
      });
      const battery = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [battery]);

      // Expected: 3500mAh * 3.6V / 1000 = 12.6Wh
      expect(chain.maxPossible).toBeCloseTo(12.6, 1);
      expect(chain.verdict).toBe('plausible');
    });

    it('sums Wh from multiple batteries', () => {
      const claim = createMockClaim({
        value: 20,
        category: 'wh',
        unit: 'Wh',
      });
      const battery1 = createBatteryComponent(3500, 3.6, 8);
      const battery2 = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [battery1, battery2]);

      // Expected: 2 * (3500 * 3.6 / 1000) = 25.2Wh
      expect(chain.maxPossible).toBeCloseTo(25.2, 1);
      expect(chain.verdict).toBe('plausible');
    });
  });

  describe('Power Chain (Chargers)', () => {
    it('builds chain with USB PD controller limit', () => {
      const claim = createMockClaim({
        value: 65,
        category: 'watts',
        unit: 'W',
      });
      const pdController = createPdController(100, 20);

      const chain = buildConstraintChain(claim, [pdController]);

      expect(chain.verdict).toBe('plausible');
      expect(chain.maxPossible).toBe(100);
    });

    it('identifies PD controller as bottleneck', () => {
      const claim = createMockClaim({
        value: 120,
        category: 'watts',
        unit: 'W',
      });
      const pdController = createPdController(65, 20);

      const chain = buildConstraintChain(claim, [pdController]);

      expect(chain.verdict).toBe('impossible');
      expect(chain.maxPossible).toBe(65);
    });

    it('considers DC-DC converter power limit', () => {
      const claim = createMockClaim({
        value: 50,
        category: 'watts',
        unit: 'W',
      });
      const dcdc = createDcdcConverter(3, 12); // 3A * 12V = 36W

      const chain = buildConstraintChain(claim, [dcdc]);

      expect(chain.verdict).toBe('impossible');
      expect(chain.maxPossible).toBe(36);
    });
  });

  describe('Current Chain (Amps)', () => {
    it('finds current limit from components', () => {
      const claim = createMockClaim({
        value: 5,
        category: 'amps',
        unit: 'A',
      });
      const battery = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [battery]);

      expect(chain.verdict).toBe('plausible');
      expect(chain.links.length).toBeGreaterThan(0);
    });

    it('identifies current bottleneck', () => {
      const claim = createMockClaim({
        value: 10,
        category: 'amps',
        unit: 'A',
      });
      const battery = createBatteryComponent(3500, 3.6, 5); // Only 5A discharge

      const chain = buildConstraintChain(claim, [battery]);

      expect(chain.verdict).toBe('impossible');
    });
  });

  describe('Voltage Chain', () => {
    it('calculates max voltage from DC-DC converter', () => {
      const claim = createMockClaim({
        value: 12,
        category: 'volts',
        unit: 'V',
      });
      const dcdc = createDcdcConverter(3, 15);

      const chain = buildConstraintChain(claim, [dcdc]);

      expect(chain.verdict).toBe('plausible');
      expect(chain.maxPossible).toBe(15);
    });

    it('calculates max voltage from series batteries', () => {
      const claim = createMockClaim({
        value: 7,
        category: 'volts',
        unit: 'V',
      });
      const battery1 = createBatteryComponent(3500, 3.6, 8);
      const battery2 = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [battery1, battery2]);

      // Series = 3.6V + 3.6V = 7.2V
      expect(chain.verdict).toBe('plausible');
      expect(chain.maxPossible).toBeCloseTo(7.2, 1);
    });

    it('considers USB PD supported voltages', () => {
      const claim = createMockClaim({
        value: 20,
        category: 'volts',
        unit: 'V',
      });
      const pdController = createPdController(100, 20);

      const chain = buildConstraintChain(claim, [pdController]);

      expect(chain.verdict).toBe('plausible');
      expect(chain.maxPossible).toBeGreaterThanOrEqual(20);
    });

    it('marks impossible when voltage exceeds limits', () => {
      const claim = createMockClaim({
        value: 24,
        category: 'volts',
        unit: 'V',
      });
      const pdController = createPdController(100, 20);

      const chain = buildConstraintChain(claim, [pdController]);

      expect(chain.verdict).toBe('impossible');
    });
  });

  describe('Confidence Calculation', () => {
    it('returns high confidence with 3+ high quality links', () => {
      const claim = createMockClaim({ value: 500, category: 'lumens' });
      const led = createLedComponent(1052, 3000);
      const driver = createDriverComponent(3000);
      const battery = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [led, driver, battery]);

      expect(chain.confidence).toBe('high');
    });

    it('returns medium confidence with 2 links', () => {
      const claim = createMockClaim({ value: 500, category: 'lumens' });
      const led = createLedComponent(1052, 3000);
      const driver = createDriverComponent(3000);

      const chain = buildConstraintChain(claim, [led, driver]);

      expect(chain.confidence).toBe('medium');
    });

    it('returns low confidence with uncertain matches', () => {
      const claim = createMockClaim({ value: 500, category: 'lumens' });
      const led: ComponentWithSpecs = {
        match: createMockMatch({
          status: 'partial',
          confidence: 0.5,
        }),
        specs: createMockSpecs({
          category: 'led',
          specs: {
            luminous_flux: {
              value: 1052,
              unit: 'lm',
              conditions: null,
              min: null,
              max: 1052,
              typical: 1052,
            },
          },
        }),
        error: null,
      };

      const chain = buildConstraintChain(claim, [led]);

      expect(chain.confidence).toBe('low');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing spec values gracefully', () => {
      const claim = createMockClaim({ value: 1000, category: 'lumens' });
      const led: ComponentWithSpecs = {
        match: createMockMatch({ category: 'led' }),
        specs: createMockSpecs({
          category: 'led',
          specs: {}, // Empty specs
        }),
        error: null,
      };

      const chain = buildConstraintChain(claim, [led]);

      expect(chain.verdict).toBe('uncertain');
    });

    it('handles mixed components for flashlight', () => {
      const claim = createMockClaim({ value: 500, category: 'lumens' });
      const led = createLedComponent(1052, 3000);
      const pdController = createPdController(65, 20); // Irrelevant for flashlight

      const chain = buildConstraintChain(claim, [led, pdController]);

      // Should only use LED, not PD controller for lumens
      expect(chain.links.length).toBeGreaterThan(0);
      expect(chain.verdict).toBe('plausible');
    });

    it('returns correct unit in chain', () => {
      const claim = createMockClaim({
        value: 10000,
        category: 'mah',
        unit: 'mAh',
      });
      const battery = createBatteryComponent(3500, 3.6, 8);

      const chain = buildConstraintChain(claim, [battery]);

      expect(chain.unit).toBe('mAh');
    });
  });
});

describe('EFFICIENCY_CONFIG', () => {
  it('has valid power bank efficiency values', () => {
    expect(EFFICIENCY_CONFIG.powerBank.dcDcConversion).toBeGreaterThan(0);
    expect(EFFICIENCY_CONFIG.powerBank.dcDcConversion).toBeLessThanOrEqual(1);
    expect(EFFICIENCY_CONFIG.powerBank.overall).toBeGreaterThan(0);
    expect(EFFICIENCY_CONFIG.powerBank.overall).toBeLessThanOrEqual(1);
  });

  it('has valid charger efficiency values', () => {
    expect(EFFICIENCY_CONFIG.charger.acDcConversion).toBeGreaterThan(0);
    expect(EFFICIENCY_CONFIG.charger.acDcConversion).toBeLessThanOrEqual(1);
    expect(EFFICIENCY_CONFIG.charger.overall).toBeGreaterThan(0);
    expect(EFFICIENCY_CONFIG.charger.overall).toBeLessThanOrEqual(1);
  });

  it('has valid flashlight efficiency values', () => {
    expect(EFFICIENCY_CONFIG.flashlight.driverEfficiency).toBeGreaterThan(0);
    expect(EFFICIENCY_CONFIG.flashlight.driverEfficiency).toBeLessThanOrEqual(1);
    expect(EFFICIENCY_CONFIG.flashlight.thermalDerating).toBeGreaterThan(0);
    expect(EFFICIENCY_CONFIG.flashlight.thermalDerating).toBeLessThanOrEqual(1);
  });

  it('has valid default efficiency', () => {
    expect(EFFICIENCY_CONFIG.default).toBeGreaterThan(0);
    expect(EFFICIENCY_CONFIG.default).toBeLessThanOrEqual(1);
  });
});
