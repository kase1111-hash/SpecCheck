/**
 * VerdictGenerator Tests
 */

import {
  getVerdictColor,
  getVerdictIcon,
  getVerdictLabel,
  getConfidenceDescription,
} from '../src/analysis/VerdictGenerator';

describe('VerdictGenerator', () => {
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
});
