/**
 * ComponentMatcher
 *
 * Matches extracted text to known components
 * using local cache and API fallback.
 */

import type {
  ExtractedText,
  MatchedComponent,
  MatchResult,
  MatchCandidate,
  MatchStatus,
  ComponentCategory,
} from '@speccheck/shared-types';
import { getOCREngine } from './OCREngine';

/**
 * Confidence thresholds
 */
const CONFIDENT_THRESHOLD = 0.9;
const PARTIAL_THRESHOLD = 0.7;

/**
 * Component matcher service
 */
export class ComponentMatcher {
  private ocrEngine = getOCREngine();

  /**
   * Match extracted text to known components
   */
  async matchAll(extractions: ExtractedText[]): Promise<MatchResult> {
    const components: MatchedComponent[] = [];

    let matchedCount = 0;
    let partialCount = 0;
    let unknownCount = 0;

    for (const extraction of extractions) {
      const matched = await this.match(extraction);
      components.push(matched);

      switch (matched.status) {
        case 'confident':
          matchedCount++;
          break;
        case 'partial':
          partialCount++;
          break;
        case 'unknown':
          unknownCount++;
          break;
      }
    }

    return {
      frameId: extractions[0]?.regionId.split('_')[0] || '',
      components,
      matchedCount,
      partialCount,
      unknownCount,
    };
  }

  /**
   * Match a single extraction to a component
   */
  async match(extraction: ExtractedText): Promise<MatchedComponent> {
    const { cleanedText, regionId } = extraction;

    // Extract part number and manufacturer from text
    const partNumber = this.ocrEngine.extractPartNumber(cleanedText);
    const manufacturer = this.ocrEngine.extractManufacturer(cleanedText);

    if (!partNumber) {
      return this.createUnknownMatch(regionId, extraction);
    }

    // Try to match in local cache first
    const cacheMatch = await this.matchInCache(partNumber);
    if (cacheMatch) {
      return this.createConfidentMatch(
        regionId,
        cacheMatch.partNumber,
        cacheMatch.manufacturer,
        cacheMatch.category,
        cacheMatch.datasheetId
      );
    }

    // Try fuzzy matching
    const fuzzyMatches = await this.fuzzyMatch(partNumber);
    if (fuzzyMatches.length > 0) {
      if (fuzzyMatches[0].confidence >= CONFIDENT_THRESHOLD) {
        return this.createConfidentMatch(
          regionId,
          fuzzyMatches[0].partNumber,
          fuzzyMatches[0].manufacturer,
          'ic_generic', // Will be refined later
          fuzzyMatches[0].datasheetId
        );
      } else {
        return this.createPartialMatch(
          regionId,
          partNumber,
          manufacturer,
          fuzzyMatches
        );
      }
    }

    // No match found - return with extracted info
    return {
      regionId,
      status: 'partial',
      partNumber,
      manufacturer,
      category: this.guessCategory(cleanedText),
      confidence: 0.5,
      datasheetId: null,
      alternatives: [],
    };
  }

  /**
   * Match part number in local cache
   */
  private async matchInCache(
    partNumber: string
  ): Promise<{
    partNumber: string;
    manufacturer: string;
    category: ComponentCategory;
    datasheetId: string;
  } | null> {
    // TODO: Implement local SQLite cache lookup
    // const db = await getDatabase();
    // const result = await db.getFirstAsync(
    //   'SELECT * FROM datasheets WHERE part_number = ?',
    //   [partNumber]
    // );
    return null;
  }

  /**
   * Fuzzy match part number against known patterns
   */
  private async fuzzyMatch(partNumber: string): Promise<MatchCandidate[]> {
    // TODO: Implement fuzzy matching
    // 1. Load component patterns from local DB
    // 2. Calculate Levenshtein distance
    // 3. Return matches within threshold

    const candidates: MatchCandidate[] = [];

    // Check against known component patterns
    const knownPatterns = this.getKnownPatterns();

    for (const pattern of knownPatterns) {
      const distance = this.levenshteinDistance(
        partNumber.toUpperCase(),
        pattern.partNumber.toUpperCase()
      );
      const maxLen = Math.max(partNumber.length, pattern.partNumber.length);
      const similarity = 1 - distance / maxLen;

      if (similarity >= PARTIAL_THRESHOLD) {
        candidates.push({
          partNumber: pattern.partNumber,
          manufacturer: pattern.manufacturer,
          confidence: similarity,
          datasheetId: pattern.datasheetId,
        });
      }
    }

    // Sort by confidence descending
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get known component patterns
   * TODO: Load from database
   */
  private getKnownPatterns(): Array<{
    partNumber: string;
    manufacturer: string;
    datasheetId: string;
  }> {
    // Common components for development/testing
    return [
      { partNumber: 'XM-L2', manufacturer: 'Cree', datasheetId: 'cree_xml2' },
      { partNumber: 'XP-G3', manufacturer: 'Cree', datasheetId: 'cree_xpg3' },
      { partNumber: 'PT4115', manufacturer: 'PowTech', datasheetId: 'pt4115' },
      { partNumber: 'TP4056', manufacturer: 'NanJing Top Power', datasheetId: 'tp4056' },
      { partNumber: 'LM2596', manufacturer: 'Texas Instruments', datasheetId: 'lm2596' },
      { partNumber: 'INR18650-35E', manufacturer: 'Samsung SDI', datasheetId: 'samsung_35e' },
    ];
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Guess component category from text
   */
  private guessCategory(text: string): ComponentCategory {
    const upper = text.toUpperCase();

    // LED patterns
    if (/XM-?L|XP-?[GEHL]|SST-?\d|LH351|LM301/.test(upper)) {
      return 'led';
    }

    // LED driver patterns
    if (/PT41|TP40|QX\d|AL\d|FP\d/.test(upper)) {
      return 'led_driver';
    }

    // Battery management
    if (/TP40|DW01|FS312|S8261/.test(upper)) {
      return 'bms';
    }

    // USB PD
    if (/IP2|SW35|FUSB|STUSB|CYPD/.test(upper)) {
      return 'usb_pd';
    }

    // DC-DC converters
    if (/LM25|MP\d|TPS\d|RT\d|SY\d/.test(upper)) {
      return 'dc_dc';
    }

    // Audio
    if (/TPA\d|PAM\d|NS\d|CS\d/.test(upper)) {
      return 'audio_amp';
    }

    // Battery cell
    if (/INR|NCR|ICR|\d{5}/.test(upper)) {
      return 'battery_cell';
    }

    return 'ic_generic';
  }

  /**
   * Create a confident match result
   */
  private createConfidentMatch(
    regionId: string,
    partNumber: string,
    manufacturer: string,
    category: ComponentCategory,
    datasheetId: string
  ): MatchedComponent {
    return {
      regionId,
      status: 'confident',
      partNumber,
      manufacturer,
      category,
      confidence: 0.95,
      datasheetId,
      alternatives: [],
    };
  }

  /**
   * Create a partial match result
   */
  private createPartialMatch(
    regionId: string,
    partNumber: string | null,
    manufacturer: string | null,
    alternatives: MatchCandidate[]
  ): MatchedComponent {
    return {
      regionId,
      status: 'partial',
      partNumber: alternatives[0]?.partNumber || partNumber,
      manufacturer: alternatives[0]?.manufacturer || manufacturer,
      category: 'ic_generic',
      confidence: alternatives[0]?.confidence || 0.5,
      datasheetId: alternatives[0]?.datasheetId || null,
      alternatives: alternatives.slice(1),
    };
  }

  /**
   * Create an unknown match result
   */
  private createUnknownMatch(
    regionId: string,
    extraction: ExtractedText
  ): MatchedComponent {
    return {
      regionId,
      status: 'unknown',
      partNumber: null,
      manufacturer: null,
      category: 'unknown',
      confidence: 0,
      datasheetId: null,
      alternatives: [],
    };
  }
}

/**
 * Singleton instance
 */
let matcherInstance: ComponentMatcher | null = null;

/**
 * Get the component matcher instance
 */
export function getComponentMatcher(): ComponentMatcher {
  if (!matcherInstance) {
    matcherInstance = new ComponentMatcher();
  }
  return matcherInstance;
}
