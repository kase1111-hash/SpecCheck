/**
 * ConsentManager
 *
 * Manages user consent for data processing activities.
 * Consent is required only for community submissions.
 */

import type { DataCategory } from './PrivacyPolicy';
import { getDataPolicy } from './PrivacyPolicy';

/**
 * Types of consent
 */
export type ConsentType =
  | 'community_submission'  // Sharing verifications publicly
  | 'account_creation'      // Creating an optional account
  | 'analytics';            // Analytics (we don't use this)

/**
 * Consent record
 */
export interface ConsentRecord {
  type: ConsentType;
  granted: boolean;
  grantedAt: number | null;
  revokedAt: number | null;
  version: string; // Policy version
}

/**
 * Current policy version
 */
const POLICY_VERSION = '1.0.0';

/**
 * Storage key for consent
 */
const CONSENT_STORAGE_KEY = '@speccheck/consent';

/**
 * Consent Manager
 */
export class ConsentManager {
  private consents: Map<ConsentType, ConsentRecord> = new Map();
  private loaded: boolean = false;

  /**
   * Load consents from storage
   */
  async load(): Promise<void> {
    // TODO: Load from AsyncStorage
    // const stored = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    // if (stored) {
    //   const parsed = JSON.parse(stored);
    //   for (const [type, record] of Object.entries(parsed)) {
    //     this.consents.set(type as ConsentType, record as ConsentRecord);
    //   }
    // }
    this.loaded = true;
  }

  /**
   * Save consents to storage
   */
  private async save(): Promise<void> {
    const data: Record<string, ConsentRecord> = {};
    for (const [type, record] of this.consents) {
      data[type] = record;
    }
    // TODO: Save to AsyncStorage
    // await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Check if consent is required for a data category
   */
  requiresConsent(category: DataCategory): boolean {
    const policy = getDataPolicy(category);
    return policy.requiresConsent;
  }

  /**
   * Check if consent has been granted
   */
  hasConsent(type: ConsentType): boolean {
    const record = this.consents.get(type);
    return record?.granted === true && record.version === POLICY_VERSION;
  }

  /**
   * Grant consent
   */
  async grant(type: ConsentType): Promise<void> {
    const record: ConsentRecord = {
      type,
      granted: true,
      grantedAt: Date.now(),
      revokedAt: null,
      version: POLICY_VERSION,
    };
    this.consents.set(type, record);
    await this.save();
  }

  /**
   * Revoke consent
   */
  async revoke(type: ConsentType): Promise<void> {
    const existing = this.consents.get(type);
    if (existing) {
      existing.granted = false;
      existing.revokedAt = Date.now();
      this.consents.set(type, existing);
      await this.save();
    }
  }

  /**
   * Get all consent records
   */
  getAllConsents(): ConsentRecord[] {
    return Array.from(this.consents.values());
  }

  /**
   * Reset all consents
   */
  async resetAll(): Promise<void> {
    this.consents.clear();
    await this.save();
  }

  /**
   * Get consent explanation for UI
   */
  getConsentExplanation(type: ConsentType): {
    title: string;
    description: string;
    required: boolean;
  } {
    const explanations: Record<ConsentType, { title: string; description: string; required: boolean }> = {
      community_submission: {
        title: 'Community Sharing',
        description:
          'Allow sharing your verifications with the community. ' +
          'Your submissions will be public and help others identify fake products. ' +
          'You choose what to share and can delete submissions later.',
        required: false,
      },
      account_creation: {
        title: 'Create Account',
        description:
          'Create an optional account to track your contributions and earn reputation. ' +
          'Only your email is required. You can delete your account anytime.',
        required: false,
      },
      analytics: {
        title: 'Usage Analytics',
        description: 'We do not collect usage analytics.',
        required: false,
      },
    };

    return explanations[type];
  }
}

/**
 * Singleton instance
 */
let managerInstance: ConsentManager | null = null;

/**
 * Get consent manager instance
 */
export function getConsentManager(): ConsentManager {
  if (!managerInstance) {
    managerInstance = new ConsentManager();
  }
  return managerInstance;
}
