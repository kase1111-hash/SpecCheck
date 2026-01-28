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

    // Calculate confidence based on text extraction success
    const confidence = rawLines.length > 0
      ? Math.min(0.95, 0.5 + (rawLines.length * 0.1) + (cleanedText.length > 5 ? 0.2 : 0))
      : 0.1;

    return {
      regionId: region.regionId,
      rawLines,
      cleanedText,
      confidence,
      words: this.extractWords(rawLines),
    };
  }

  /**
   * Run OCR on a region of the image using platform text recognition
   */
  private async runOCR(
    imageBase64: string,
    bbox: BoundingBox
  ): Promise<string[]> {
    try {
      // Dynamically import expo-image-manipulator for cropping
      const ImageManipulator = await import('expo-image-manipulator');

      // Crop image to the bounding box region
      const croppedResult = await ImageManipulator.manipulateAsync(
        imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
        [
          {
            crop: {
              originX: bbox.x,
              originY: bbox.y,
              width: bbox.width,
              height: bbox.height,
            },
          },
        ],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Use react-native-mlkit-ocr for text recognition
      // This requires the package to be installed: npm install @react-native-ml-kit/text-recognition
      try {
        const TextRecognition = await import('@react-native-ml-kit/text-recognition');
        const result = await TextRecognition.default.recognize(croppedResult.uri);

        // Extract text lines from all blocks
        const lines: string[] = [];
        for (const block of result.blocks) {
          for (const line of block.lines) {
            if (line.text && line.text.trim().length > 0) {
              lines.push(line.text);
            }
          }
        }

        return lines;
      } catch (mlkitError) {
        // Fallback: Try using expo's built-in OCR capabilities if available
        console.warn('[OCREngine] ML Kit not available, trying fallback:', mlkitError);
        return this.runFallbackOCR(croppedResult.base64 || '');
      }
    } catch (error) {
      console.error('[OCREngine] OCR processing error:', error);
      return [];
    }
  }

  /**
   * Fallback OCR using tesseract.js for web/development
   * or returning mock data for testing
   */
  private async runFallbackOCR(imageBase64: string): Promise<string[]> {
    // In development/testing, check if we have known test patterns
    // This allows the app to function with mock data during development
    if (__DEV__) {
      console.log('[OCREngine] Running in development mode with mock OCR');
      // Return empty - the ComponentMatcher will use its known patterns
      return [];
    }

    // For production without ML Kit, try tesseract.js (web) or return empty
    try {
      // Dynamic import for web environments
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(
        `data:image/jpeg;base64,${imageBase64}`,
        'eng',
        { logger: () => {} } // Suppress logging
      );

      return result.data.lines.map((line: { text: string }) => line.text);
    } catch {
      // Tesseract not available
      return [];
    }
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
   * Extract words with placeholder bounding boxes from raw lines
   */
  private extractWords(rawLines: string[]): OCRWord[] {
    const words: OCRWord[] = [];
    let yOffset = 0;

    for (const line of rawLines) {
      const lineWords = line.split(/\s+/);
      let xOffset = 0;

      for (const word of lineWords) {
        if (word.trim().length > 0) {
          words.push({
            text: word,
            confidence: 0.9, // Placeholder confidence
            bbox: {
              x: xOffset,
              y: yOffset,
              width: word.length * 10, // Approximate width
              height: 20, // Approximate height
            },
          });
          xOffset += word.length * 10 + 5;
        }
      }
      yOffset += 25;
    }

    return words;
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
