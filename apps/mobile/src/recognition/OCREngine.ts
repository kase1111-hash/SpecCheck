/**
 * OCREngine
 *
 * Extracts text from detected component regions
 * using platform-native OCR (MLKit/Vision).
 */

import type {
  DetectedRegion,
  ExtractedText,
  OCRResult,
  OCRWord,
  BoundingBox,
} from '@speccheck/shared-types';

/**
 * Common OCR misreads in chip markings
 */
const OCR_CORRECTIONS: Record<string, string> = {
  '0': 'O', // Context-dependent
  'O': '0', // Context-dependent
  '1': 'I', // Context-dependent
  'I': '1', // Context-dependent
  '5': 'S', // Context-dependent
  'S': '5', // Context-dependent
  '8': 'B', // Context-dependent
  'B': '8', // Context-dependent
};

/**
 * Known manufacturer codes/patterns
 */
const MANUFACTURER_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /^CREE/i, name: 'Cree' },
  { pattern: /^LUM/i, name: 'Lumileds' },
  { pattern: /^SAM/i, name: 'Samsung' },
  { pattern: /^OSR/i, name: 'Osram' },
  { pattern: /^TI\b/i, name: 'Texas Instruments' },
  { pattern: /^LM\d/i, name: 'Texas Instruments' },
  { pattern: /^PT\d/i, name: 'PowTech' },
  { pattern: /^TP\d/i, name: 'Toppower' },
  { pattern: /^MP\d/i, name: 'Monolithic Power' },
  { pattern: /^IR\d/i, name: 'Infineon' },
  { pattern: /^STM/i, name: 'STMicroelectronics' },
  { pattern: /^NXP/i, name: 'NXP' },
  { pattern: /^MAX\d/i, name: 'Maxim/Analog Devices' },
  { pattern: /^AO\d/i, name: 'Alpha & Omega' },
  { pattern: /^SY\d/i, name: 'Silergy' },
];

/**
 * OCR Engine for text extraction
 */
export class OCREngine {
  /**
   * Extract text from multiple regions
   */
  async extractFromRegions(
    imageBase64: string,
    regions: DetectedRegion[]
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const extractions: ExtractedText[] = [];

    for (const region of regions) {
      const extracted = await this.extractFromRegion(imageBase64, region);
      extractions.push(extracted);
    }

    return {
      frameId: regions[0]?.frameId || '',
      extractions,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Extract text from a single region
   */
  async extractFromRegion(
    imageBase64: string,
    region: DetectedRegion
  ): Promise<ExtractedText> {
    // TODO: Implement actual OCR using MLKit/Vision
    // 1. Crop image to region
    // 2. Run OCR
    // 3. Process results

    // Mock implementation for development
    const rawLines = await this.runOCR(imageBase64, region.bbox);
    const cleanedText = this.cleanOCRText(rawLines);

    return {
      regionId: region.regionId,
      rawLines,
      cleanedText,
      confidence: 0.9, // TODO: Get from OCR result
      words: [], // TODO: Populate from OCR
    };
  }

  /**
   * Run OCR on a region of the image
   * Placeholder for actual MLKit/Vision implementation
   */
  private async runOCR(
    imageBase64: string,
    bbox: BoundingBox
  ): Promise<string[]> {
    // TODO: Implement actual OCR
    // Example using expo-ml-kit or react-native-mlkit-ocr:
    // const result = await MLKit.textRecognition(croppedImage);
    // return result.blocks.flatMap(b => b.lines.map(l => l.text));

    // Return empty for development
    return [];
  }

  /**
   * Clean and normalize OCR text
   */
  cleanOCRText(lines: string[]): string {
    return lines
      .map((line) => this.cleanLine(line))
      .filter((line) => line.length > 0)
      .join(' ');
  }

  /**
   * Clean a single line of OCR text
   */
  private cleanLine(line: string): string {
    let cleaned = line
      .trim()
      .toUpperCase()
      // Remove common noise characters
      .replace(/[^\w\s\-\.]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ');

    // Apply context-aware corrections
    cleaned = this.applyContextCorrections(cleaned);

    return cleaned;
  }

  /**
   * Apply context-aware OCR corrections
   */
  private applyContextCorrections(text: string): string {
    // Part numbers typically follow patterns like:
    // XM-L2, PT4115, TP4056, LM2596, etc.

    // If it looks like a part number (letters followed by numbers),
    // be more aggressive with corrections
    if (/^[A-Z]{1,3}\d/.test(text)) {
      // This is likely a part number, apply number corrections
      text = text
        .replace(/O(?=\d)/g, '0') // O before digit -> 0
        .replace(/I(?=\d)/g, '1') // I before digit -> 1
        .replace(/S(?=\d)/g, '5') // S before digit -> 5
        .replace(/B(?=\d)/g, '8'); // B before digit -> 8
    }

    return text;
  }

  /**
   * Extract manufacturer from text
   */
  extractManufacturer(text: string): string | null {
    for (const { pattern, name } of MANUFACTURER_PATTERNS) {
      if (pattern.test(text)) {
        return name;
      }
    }
    return null;
  }

  /**
   * Extract part number from text
   */
  extractPartNumber(text: string): string | null {
    // Common part number patterns
    const patterns = [
      // LED: XM-L2, XP-G3, SST-40
      /\b([A-Z]{2,3}-[A-Z0-9]{1,3})\b/,
      // Driver ICs: PT4115, TP4056, LM2596
      /\b([A-Z]{2}\d{4}[A-Z]?)\b/,
      // Generic ICs: MAX17048, STM32F103
      /\b([A-Z]{2,3}\d{4,5}[A-Z0-9]*)\b/,
      // Battery cells: INR18650-35E
      /\b(INR\d{5}-\d{2}[A-Z]?)\b/,
      // Simple alphanumeric
      /\b([A-Z]{1,4}\d{3,5})\b/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}

/**
 * Singleton instance
 */
let ocrInstance: OCREngine | null = null;

/**
 * Get the OCR engine instance
 */
export function getOCREngine(): OCREngine {
  if (!ocrInstance) {
    ocrInstance = new OCREngine();
  }
  return ocrInstance;
}
