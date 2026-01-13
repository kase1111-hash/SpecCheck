/**
 * Community module types
 */

import type { ComponentSpecs } from '../datasheet/types';

export interface CommunitySubmission {
  /** Unique submission ID */
  id: string;
  /** Product name */
  productName: string;
  /** Original listing URL */
  listingUrl: string;
  /** Specs claimed by seller */
  claimedSpecs: Record<string, string>;
  /** Actual specs from analysis */
  actualSpecs: Record<string, string>;
  /** Verdict summary */
  verdict: string;
  /** Image URLs */
  images: string[];
  /** Components identified */
  componentList: ComponentSpecs[];
  /** Submission timestamp */
  createdAt: number;
  /** Submitter reputation score */
  submitterReputation: number;
  /** Community votes */
  upvotes: number;
  downvotes: number;
}

export interface SubmissionDraft {
  productName: string;
  listingUrl: string;
  claimedSpecs: Record<string, string>;
  actualSpecs: Record<string, string>;
  verdict: string;
  images: File[];
  componentList: ComponentSpecs[];
}

export interface CommunitySearchResult {
  submissions: CommunitySubmission[];
  totalCount: number;
  hasMore: boolean;
}

export interface CommunitySearchParams {
  query: string;
  category?: string;
  limit?: number;
  offset?: number;
}
