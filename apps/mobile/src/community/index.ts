/**
 * Community Module
 *
 * Handles community submissions and search.
 *
 * Responsibilities:
 * - Submit verified products to community database
 * - Search existing verifications
 * - Upload images for submissions
 * - Display community verification results
 *
 * Exports:
 * - SubmissionForm: UI for submitting verifications
 * - SearchView: Search community database
 * - CommunityAPI: Backend communication
 * - useSubmission: Hook for submission flow
 */

export * from './SubmissionForm';
export * from './SearchView';
export * from './CommunityAPI';
export * from './types';
