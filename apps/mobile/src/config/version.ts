/**
 * Version Configuration
 *
 * Single source of truth for app version and release info.
 */

/**
 * Current version info
 */
export const Version = {
  /** Semantic version string */
  version: '0.1.0',

  /** Build number (increments with each build) */
  build: 1,

  /** Release phase */
  phase: 1,

  /** Release name */
  name: 'Core Recognition',

  /** Is this a beta release? */
  isBeta: true,

  /** Release date (null if not released) */
  releasedAt: null as number | null,
} as const;

/**
 * Version history for changelog
 */
export const VersionHistory = [
  {
    version: '0.1.0',
    phase: 1,
    name: 'Core Recognition',
    status: 'development' as const,
    features: [
      'Camera integration with live preview',
      'On-device ML component detection',
      'OCR for chip markings',
      'Component matching against bundled database',
      'Basic AR overlay with bounding boxes',
    ],
    notes: 'Initial MVP release focused on component identification.',
  },
  {
    version: '0.2.0',
    phase: 2,
    name: 'Claim Validation',
    status: 'planned' as const,
    features: [
      'Spec retrieval from API with caching',
      'Natural language claim input',
      'Constraint chain analysis',
      'Verdict display with explanations',
    ],
    notes: 'Adds the core value proposition: verify marketing claims.',
  },
  {
    version: '0.3.0',
    phase: 3,
    name: 'Full AR Experience',
    status: 'planned' as const,
    features: [
      'Expandable spec cards',
      'Visual constraint chain overlay',
      'Pinch-to-zoom with persistence',
      'Share verdict as image',
    ],
    notes: 'Rich, interactive exploration of components.',
  },
  {
    version: '0.4.0',
    phase: 4,
    name: 'Community Layer',
    status: 'planned' as const,
    features: [
      'Search existing verifications',
      'Submit new verifications',
      'Reputation system',
      'Moderation tools',
    ],
    notes: 'Crowdsourced database of verified products.',
  },
  {
    version: '1.0.0',
    phase: 5,
    name: 'Full Release',
    status: 'planned' as const,
    features: [
      'Additional categories (audio, motors, storage)',
      'Barcode/QR scanning',
      'Browser extension',
      'Public API',
    ],
    notes: 'Feature-complete release.',
  },
];

/**
 * Get current version string
 */
export function getVersionString(): string {
  const beta = Version.isBeta ? '-beta' : '';
  return `v${Version.version}${beta}`;
}

/**
 * Get full version with build
 */
export function getFullVersion(): string {
  return `${Version.version} (${Version.build})`;
}

/**
 * Get release phase info
 */
export function getPhaseInfo(): {
  phase: number;
  name: string;
  description: string;
} {
  const phases: Record<number, { name: string; description: string }> = {
    1: { name: 'Core Recognition', description: 'See what components are inside' },
    2: { name: 'Claim Validation', description: 'Verify marketing claims' },
    3: { name: 'Full AR Experience', description: 'Explore component details' },
    4: { name: 'Community Layer', description: 'Share and search verifications' },
    5: { name: 'Full Release', description: 'Complete feature set' },
  };

  return {
    phase: Version.phase,
    ...phases[Version.phase],
  };
}
