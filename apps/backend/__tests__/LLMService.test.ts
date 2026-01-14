/**
 * LLMService Tests
 */

import { LLMService } from '../src/services/LLMService';
import type { AnalyzeRequest } from '../src/routes/types';

describe('LLMService', () => {
  let service: LLMService;

  beforeEach(() => {
    service = new LLMService('test-api-key');
  });

  describe('constructor', () => {
    it('creates instance with default model', () => {
      const svc = new LLMService('key');
      expect(svc).toBeInstanceOf(LLMService);
    });

    it('creates instance with custom model', () => {
      const svc = new LLMService('key', 'claude-3-opus');
      expect(svc).toBeInstanceOf(LLMService);
    });
  });

  describe('buildPrompt', () => {
    it('builds prompt with claim and components', () => {
      const request: AnalyzeRequest = {
        claim: {
          category: 'lumens',
          value: 10000,
          unit: 'lm',
        },
        components: [
          {
            partNumber: 'XHP70.2',
            manufacturer: 'Cree',
            category: 'led',
            specs: {
              maxLumens: {
                value: 4022,
                unit: 'lm',
                conditions: '@ 3A',
                min: null,
                max: null,
                typical: 4022,
              },
            },
          },
        ],
        category: 'flashlight',
      };

      // Access private method for testing via type assertion
      const prompt = (service as any).buildPrompt(request);

      expect(prompt).toContain('10000 lm');
      expect(prompt).toContain('lumens');
      expect(prompt).toContain('XHP70.2');
      expect(prompt).toContain('Cree');
      expect(prompt).toContain('maxLumens');
      expect(prompt).toContain('plausible');
      expect(prompt).toContain('impossible');
      expect(prompt).toContain('uncertain');
    });
  });

  describe('parseResponse', () => {
    it('parses valid JSON response', () => {
      const jsonResponse = JSON.stringify({
        verdict: 'impossible',
        maxPossible: 4022,
        unit: 'lm',
        reasoning: 'The LED can only output 4022 lumens',
        chain: [
          {
            component: 'XHP70.2',
            constraintType: 'max luminous flux',
            maxValue: 4022,
            unit: 'lm',
            isBottleneck: true,
            explanation: 'LED limits output',
          },
        ],
      });

      const result = (service as any).parseResponse(jsonResponse);

      expect(result.verdict).toBe('impossible');
      expect(result.maxPossible).toBe(4022);
      expect(result.unit).toBe('lm');
      expect(result.chain).toHaveLength(1);
      expect(result.chain[0].isBottleneck).toBe(true);
    });

    it('parses JSON wrapped in markdown code block', () => {
      const response = '```json\n{"verdict": "plausible", "maxPossible": 5000, "unit": "lm", "reasoning": "Test", "chain": []}\n```';

      const result = (service as any).parseResponse(response);

      expect(result.verdict).toBe('plausible');
      expect(result.maxPossible).toBe(5000);
    });

    it('handles invalid verdict by defaulting to uncertain', () => {
      const jsonResponse = JSON.stringify({
        verdict: 'invalid_verdict',
        maxPossible: 100,
        unit: 'W',
        reasoning: 'Test',
        chain: [],
      });

      const result = (service as any).parseResponse(jsonResponse);

      expect(result.verdict).toBe('uncertain');
    });

    it('handles missing chain by returning empty array', () => {
      const jsonResponse = JSON.stringify({
        verdict: 'plausible',
        maxPossible: 100,
        unit: 'W',
        reasoning: 'Test',
      });

      const result = (service as any).parseResponse(jsonResponse);

      expect(result.chain).toEqual([]);
    });
  });

  describe('validateChainLink', () => {
    it('validates and sanitizes chain link', () => {
      const link = {
        component: 'Test',
        constraintType: 'power',
        maxValue: 100,
        unit: 'W',
        isBottleneck: true,
        explanation: 'Test explanation',
      };

      const result = (service as any).validateChainLink(link);

      expect(result.component).toBe('Test');
      expect(result.maxValue).toBe(100);
      expect(result.isBottleneck).toBe(true);
    });

    it('handles missing fields with defaults', () => {
      const link = {};

      const result = (service as any).validateChainLink(link);

      expect(result.component).toBe('Unknown');
      expect(result.constraintType).toBe('Unknown');
      expect(result.maxValue).toBe(0);
      expect(result.unit).toBe('');
      expect(result.isBottleneck).toBe(false);
      expect(result.explanation).toBe('');
    });
  });
});
