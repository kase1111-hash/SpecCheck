/**
 * LLM Service
 *
 * Handles Claude API integration for claim analysis.
 */

import type { AnalyzeRequest, AnalyzeResponse, ChainLink } from '../routes/types';

/**
 * Claude API response structure
 */
interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Expected JSON response from Claude
 */
interface AnalysisResult {
  verdict: 'plausible' | 'impossible' | 'uncertain';
  maxPossible: number;
  unit: string;
  reasoning: string;
  chain: ChainLink[];
}

export class LLMService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Analyze a claim using Claude
   */
  async analyzeClaim(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const prompt = this.buildPrompt(request);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as ClaudeResponse;
      const textContent = data.content.find((c) => c.type === 'text');

      if (!textContent) {
        throw new Error('No text content in Claude response');
      }

      // Parse JSON from response
      const result = this.parseResponse(textContent.text);
      return result;
    } catch (error) {
      console.error('LLM analysis failed:', error);

      // Return uncertain verdict on error
      return {
        verdict: 'uncertain',
        maxPossible: 0,
        unit: request.claim.unit,
        reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        chain: [],
      };
    }
  }

  /**
   * Parse and validate Claude's JSON response
   */
  private parseResponse(text: string): AnalyzeResponse {
    // Extract JSON from response (may be wrapped in markdown code block)
    let jsonStr = text;

    // Try to extract from code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try to find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr) as AnalysisResult;

    // Validate required fields
    if (!['plausible', 'impossible', 'uncertain'].includes(parsed.verdict)) {
      parsed.verdict = 'uncertain';
    }

    return {
      verdict: parsed.verdict,
      maxPossible: Number(parsed.maxPossible) || 0,
      unit: parsed.unit || '',
      reasoning: parsed.reasoning || 'No reasoning provided',
      chain: Array.isArray(parsed.chain) ? parsed.chain.map(this.validateChainLink) : [],
    };
  }

  /**
   * Validate and sanitize a chain link
   */
  private validateChainLink(link: Partial<ChainLink>): ChainLink {
    return {
      component: String(link.component || 'Unknown'),
      constraintType: String(link.constraintType || 'Unknown'),
      maxValue: Number(link.maxValue) || 0,
      unit: String(link.unit || ''),
      isBottleneck: Boolean(link.isBottleneck),
      explanation: String(link.explanation || ''),
    };
  }

  /**
   * Build prompt for claim analysis
   */
  private buildPrompt(request: AnalyzeRequest): string {
    const componentList = request.components
      .map((c) => {
        const specEntries = Object.entries(c.specs)
          .map(([key, spec]) => {
            const value = spec.typical ?? spec.value;
            const range = spec.min !== null && spec.max !== null
              ? ` (${spec.min}-${spec.max})`
              : '';
            return `    ${key}: ${value}${spec.unit}${range}${spec.conditions ? ` @ ${spec.conditions}` : ''}`;
          })
          .join('\n');
        return `- ${c.partNumber} (${c.manufacturer}, ${c.category}):\n${specEntries}`;
      })
      .join('\n\n');

    return `You are an expert electrical engineer analyzing whether a product specification claim is physically achievable based on its detected components.

## Task
Analyze the following claim and determine if it's physically possible given the component specifications.

## Claim
${request.claim.value} ${request.claim.unit} (Category: ${request.claim.category})

## Detected Components
${componentList}

## Instructions
1. Identify the constraint chain - which components limit the maximum achievable output
2. Calculate the theoretical maximum based on component specifications
3. Identify the bottleneck component (the weakest link)
4. Determine if the claim is plausible, impossible, or uncertain

## Response Format
Respond with ONLY a JSON object (no markdown, no explanation outside JSON):
{
  "verdict": "plausible" | "impossible" | "uncertain",
  "maxPossible": <number - the maximum achievable value>,
  "unit": "<the unit of measurement>",
  "reasoning": "<2-3 sentence explanation of your analysis>",
  "chain": [
    {
      "component": "<part number>",
      "constraintType": "<what this component limits, e.g., 'max output current'>",
      "maxValue": <number>,
      "unit": "<unit>",
      "isBottleneck": <true if this is the limiting factor>,
      "explanation": "<why this component matters>"
    }
  ]
}

Guidelines:
- "plausible": The claim is achievable or within 10% tolerance of maximum
- "impossible": The claim exceeds what components can physically deliver (>10% over max)
- "uncertain": Not enough information to determine, or components don't relate to claim`;
  }
}
