/**
 * VerdictGenerator Tests
 */

import {
  generateVerdict,
  getVerdictColor,
  getVerdictIcon,
  getVerdictLabel,
  getConfidenceDescription,
  formatVerdictForShare,
} from '../src/analysis/VerdictGenerator';
import type {
  ConstraintChain,
  Claim,
  ChainLink,
  Verdict,
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

// Helper to create a mock chain link
const createMockChainLink = (overrides?: Partial<ChainLink>): ChainLink => ({
  component: {
    category: 'led',
    boundingBox: { x: 0, y: 0, width: 100, height: 100 },
    confidence: 0.95,
    specs: {
      partNumber: 'XHP70.2',
      manufacturer: 'Cree',
    },
  },
  constraintType: 'max_luminous_flux',
  maxValue: 4022,
  unit: 'lm',
  isBottleneck: false,
  explanation: 'LED limits output to 4022 lumens',
  sourceSpec: 'maxLumens',
  ...overrides,
});

// Helper to create a mock constraint chain
const createMockChain = (overrides?: Partial<ConstraintChain>): ConstraintChain => ({
  claim: createMockClaim(),
  links: [createMockChainLink()],
  bottleneck: null,
  maxPossible: 4022,
  unit: 'lm',
  verdict: 'plausible',
  confidence: 'high',
  ...overrides,
});

describe('VerdictGenerator', () => {
  describe('generateVerdict', () => {
    it('generates verdict for plausible claim', () => {
      const chain = createMockChain({
        verdict: 'plausible',
        maxPossible: 12000,
        claim: createMockClaim({ value: 10000 }),
      });

      const verdict = generateVerdict(chain);

      expect(verdict.result).toBe('plausible');
      expect(verdict.claimed).toBe(10000);
      expect(verdict.maxPossible).toBe(12000);
      expect(verdict.unit).toBe('lm');
      expect(verdict.explanation).toContain('plausible');
      expect(verdict.analyzedAt).toBeDefined();
    });

    it('generates verdict for impossible claim', () => {
      const bottleneckLink = createMockChainLink({
        isBottleneck: true,
        maxValue: 4022,
      });

      const chain = createMockChain({
        verdict: 'impossible',
        maxPossible: 4022,
        bottleneck: bottleneckLink,
        links: [bottleneckLink],
        claim: createMockClaim({ value: 10000 }),
      });

      const verdict = generateVerdict(chain);

      expect(verdict.result).toBe('impossible');
      expect(verdict.explanation).toContain('impossible');
      expect(verdict.bottleneck).toBe('XHP70.2');
    });

    it('generates verdict for uncertain result', () => {
      const chain = createMockChain({
        verdict: 'uncertain',
        links: [],
        confidence: 'low',
      });

      const verdict = generateVerdict(chain);

      expect(verdict.result).toBe('uncertain');
      expect(verdict.explanation).toContain('Cannot verify');
    });

    it('includes details for impossible verdict', () => {
      const bottleneckLink = createMockChainLink({
        isBottleneck: true,
        explanation: 'LED limits output',
      });

      const chain = createMockChain({
        verdict: 'impossible',
        maxPossible: 4022,
        bottleneck: bottleneckLink,
        links: [bottleneckLink],
        claim: createMockClaim({ value: 10000 }),
      });

      const verdict = generateVerdict(chain);

      expect(verdict.details.length).toBeGreaterThan(0);
      expect(verdict.details.some(d => d.includes('⚠️'))).toBe(true);
    });

    it('adds low confidence warning in details', () => {
      const chain = createMockChain({
        verdict: 'plausible',
        confidence: 'low',
        links: [createMockChainLink()],
      });

      const verdict = generateVerdict(chain);

      expect(verdict.details.some(d => d.includes('Low confidence'))).toBe(true);
    });

    it('adds medium confidence note in details', () => {
      const chain = createMockChain({
        verdict: 'plausible',
        confidence: 'medium',
        links: [createMockChainLink()],
      });

      const verdict = generateVerdict(chain);

      expect(verdict.details.some(d => d.includes('Medium confidence'))).toBe(true);
    });

    it('handles chain with no links', () => {
      const chain = createMockChain({
        verdict: 'uncertain',
        links: [],
      });

      const verdict = generateVerdict(chain);

      expect(verdict.details).toContain('No relevant components were identified.');
      expect(verdict.details).toContain('Manual verification is recommended.');
    });
  });

  describe('getVerdictColor', () => {
    it('returns green for plausible', () => {
      expect(getVerdictColor('plausible')).toBe('#22C55E');
    });

    it('returns red for impossible', () => {
      expect(getVerdictColor('impossible')).toBe('#EF4444');
    });

    it('returns yellow for uncertain', () => {
      expect(getVerdictColor('uncertain')).toBe('#EAB308');
    });

    it('returns gray for unknown verdict', () => {
      expect(getVerdictColor('unknown' as any)).toBe('#6B7280');
    });
  });

  describe('getVerdictIcon', () => {
    it('returns checkmark for plausible', () => {
      expect(getVerdictIcon('plausible')).toBe('✓');
    });

    it('returns X for impossible', () => {
      expect(getVerdictIcon('impossible')).toBe('✗');
    });

    it('returns question mark for uncertain', () => {
      expect(getVerdictIcon('uncertain')).toBe('?');
    });

    it('returns bullet for unknown', () => {
      expect(getVerdictIcon('unknown' as any)).toBe('•');
    });
  });

  describe('getVerdictLabel', () => {
    it('returns PLAUSIBLE for plausible', () => {
      expect(getVerdictLabel('plausible')).toBe('PLAUSIBLE');
    });

    it('returns IMPOSSIBLE for impossible', () => {
      expect(getVerdictLabel('impossible')).toBe('IMPOSSIBLE');
    });

    it('returns UNCERTAIN for uncertain', () => {
      expect(getVerdictLabel('uncertain')).toBe('UNCERTAIN');
    });

    it('returns UNKNOWN for unknown verdict', () => {
      expect(getVerdictLabel('unknown' as any)).toBe('UNKNOWN');
    });
  });

  describe('getConfidenceDescription', () => {
    it('returns correct description for high confidence', () => {
      expect(getConfidenceDescription('high')).toBe('All key components identified');
    });

    it('returns correct description for medium confidence', () => {
      expect(getConfidenceDescription('medium')).toBe('Most components identified');
    });

    it('returns correct description for low confidence', () => {
      expect(getConfidenceDescription('low')).toBe('Limited component identification');
    });

    it('returns empty string for unknown confidence', () => {
      expect(getConfidenceDescription('unknown' as any)).toBe('');
    });
  });

  describe('formatVerdictForShare', () => {
    it('formats verdict with all sections', () => {
      const verdict: Verdict = {
        result: 'impossible',
        confidence: 'high',
        claimed: 10000,
        maxPossible: 4022,
        unit: 'lm',
        bottleneck: 'XHP70.2',
        explanation: 'The claim is physically impossible.',
        details: ['LED limits output', 'Driver limits current'],
        analyzedAt: Date.now(),
      };

      const formatted = formatVerdictForShare(verdict);

      expect(formatted).toContain('SpecCheck Analysis');
      expect(formatted).toContain('Claimed:');
      expect(formatted).toContain('Maximum Possible:');
      expect(formatted).toContain('Verdict: IMPOSSIBLE');
      expect(formatted).toContain('Details:');
      expect(formatted).toContain('LED limits output');
      expect(formatted).toContain('Driver limits current');
      expect(formatted).toContain('Analyzed:');
    });

    it('formats verdict with k suffix for large numbers', () => {
      const verdict: Verdict = {
        result: 'plausible',
        confidence: 'high',
        claimed: 10000,
        maxPossible: 12000,
        unit: 'lm',
        bottleneck: null,
        explanation: 'Claim is plausible.',
        details: [],
        analyzedAt: Date.now(),
      };

      const formatted = formatVerdictForShare(verdict);

      expect(formatted).toContain('10.0k lm');
      expect(formatted).toContain('12.0k lm');
    });

    it('handles empty details array', () => {
      const verdict: Verdict = {
        result: 'uncertain',
        confidence: 'low',
        claimed: 5000,
        maxPossible: 0,
        unit: 'lm',
        bottleneck: null,
        explanation: 'Cannot verify.',
        details: [],
        analyzedAt: Date.now(),
      };

      const formatted = formatVerdictForShare(verdict);

      expect(formatted).toContain('SpecCheck Analysis');
      expect(formatted).not.toContain('Details:');
    });
  });
});
