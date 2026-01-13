/**
 * Privacy Module
 *
 * Implements privacy-by-design principles throughout the app.
 *
 * Core Principles:
 * 1. Images never leave the device
 * 2. Only part numbers and specs are sent to servers
 * 3. No tracking, no device fingerprinting
 * 4. User controls all data
 */

export { PrivacyPolicy, DataCategory, getDataPolicy } from './PrivacyPolicy';
export { sanitizeForAPI, sanitizeForLogging, redactSensitive } from './DataSanitizer';
export { ConsentManager, getConsentManager } from './ConsentManager';
export { UserDataManager, getUserDataManager } from './UserDataManager';
export { PrivacyGuard, assertPrivacySafe } from './PrivacyGuard';
