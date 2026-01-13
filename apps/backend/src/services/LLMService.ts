/**
 * LLM Service
 *
 * Handles Claude API integration for claim analysis.
 */

import type { AnalyzeRequest, AnalyzeResponse } from '../routes/types';

export class LLMService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analyze a claim using Claude
   */
  async analyzeClaim(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const prompt = this.buildPrompt(request);

    // TODO: Implement Claude API call
    // 1. Build structured prompt
    // 2. Call Claude API with JSON mode
    // 3. Parse response
    // 4. Validate output format
    // 5. Return structured result

    return {
      verdict: 'uncertain',
      maxPossible: 0,
      unit: '',
      reasoning: 'LLM analysis not yet implemented',
      chain: [],
    };
  }

  /**
   * Build prompt for claim analysis
   */
  private buildPrompt(request: AnalyzeRequest): string {
    return `
You are analyzing whether a product claim is physically possible based on its components.

Claim: ${request.claim.value} ${request.claim.unit} (${request.claim.category})

Components detected:
${request.components.map((c) => `- ${c.partNumber} (${c.manufacturer}): ${JSON.stringify(c.specs)}`).join('\n')}

Analyze the constraint chain and determine:
1. What is the maximum possible output?
2. Which component is the bottleneck?
3. Is the claim plausible or impossible?

Respond in JSON format:
{
  "verdict": "plausible" | "impossible" | "uncertain",
  "maxPossible": number,
  "unit": string,
  "reasoning": string,
  "chain": [{ "component": string, "constraintType": string, "maxValue": number, "unit": string, "isBottleneck": boolean, "explanation": string }]
}
`.trim();
  }
}
