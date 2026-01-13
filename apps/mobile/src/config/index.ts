/**
 * Config Module
 *
 * App configuration, versioning, and feature flags.
 */

export {
  Version,
  VersionHistory,
  getVersionString,
  getFullVersion,
  getPhaseInfo,
} from './version';

export {
  getFeatureFlags,
  isFeatureEnabled,
  overrideFlag,
  applyRemoteOverrides,
  resetFlags,
  getPhaseFlags,
  type FeatureFlags,
} from './featureFlags';
