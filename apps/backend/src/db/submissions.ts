/**
 * Submissions Database Operations
 *
 * CRUD operations for community submissions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { tables } from './client';
import type {
  CommunitySubmission,
  SubmitRequest,
  ComponentSpecs,
} from '../routes/types';

/**
 * Database row type (snake_case from PostgreSQL)
 */
interface SubmissionRow {
  id: string;
  user_id: string | null;
  product_name: string;
  listing_url: string | null;
  listing_url_hash: string | null;
  claimed_specs: Record<string, string>;
  actual_specs: Record<string, string>;
  verdict: string;
  images: string[];
  component_list: ComponentSpecs[];
  upvotes: number;
  downvotes: number;
  created_at: string;
}

/**
 * Submission with user reputation joined
 */
interface SubmissionWithUser extends SubmissionRow {
  users: { reputation: number } | null;
}

/**
 * Convert database row to API response format
 */
function toCommunitySubmission(row: SubmissionWithUser): CommunitySubmission {
  return {
    id: row.id,
    productName: row.product_name,
    listingUrl: row.listing_url || '',
    claimedSpecs: row.claimed_specs,
    actualSpecs: row.actual_specs,
    verdict: row.verdict,
    images: row.images || [],
    componentList: row.component_list || [],
    createdAt: new Date(row.created_at).getTime(),
    submitterReputation: row.users?.reputation || 0,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
  };
}

/**
 * Create a secure hash from listing URL for fast lookups
 * Uses SHA-256 for collision resistance (available in Cloudflare Workers)
 */
async function hashListingUrl(url: string): Promise<string> {
  // Normalize the URL to ensure consistent hashing
  const normalizedUrl = url.toLowerCase().trim();

  // Use Web Crypto API (available in Cloudflare Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedUrl);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string (first 16 bytes = 32 chars for reasonable length)
  const hashArray = Array.from(new Uint8Array(hashBuffer).slice(0, 16));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new submission
 */
export async function createSubmission(
  client: SupabaseClient,
  submission: SubmitRequest,
  userId?: string
): Promise<CommunitySubmission> {
  // Generate URL hash if listing URL provided
  const urlHash = submission.listingUrl
    ? await hashListingUrl(submission.listingUrl)
    : null;

  const row = {
    user_id: userId || null,
    product_name: submission.productName,
    listing_url: submission.listingUrl || null,
    listing_url_hash: urlHash,
    claimed_specs: submission.claimedSpecs,
    actual_specs: submission.actualSpecs,
    verdict: submission.verdict,
    images: submission.images || [],
    component_list: submission.componentList || [],
    upvotes: 0,
    downvotes: 0,
  };

  const { data, error } = await client
    .from(tables.submissions)
    .insert(row)
    .select(`
      *,
      users (reputation)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create submission: ${error.message}`);
  }

  return toCommunitySubmission(data as SubmissionWithUser);
}

/**
 * Get a submission by ID
 */
export async function getSubmissionById(
  client: SupabaseClient,
  id: string
): Promise<CommunitySubmission | null> {
  const { data, error } = await client
    .from(tables.submissions)
    .select(`
      *,
      users (reputation)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch submission: ${error.message}`);
  }

  return toCommunitySubmission(data as SubmissionWithUser);
}

/**
 * Search submissions using full-text search
 */
export async function searchSubmissions(
  client: SupabaseClient,
  query: string,
  category?: string,
  limit = 20,
  offset = 0
): Promise<CommunitySubmission[]> {
  let dbQuery = client
    .from(tables.submissions)
    .select(`
      *,
      users (reputation)
    `);

  // Add full-text search if query provided
  if (query && query.trim()) {
    dbQuery = dbQuery.textSearch('search_vector', query, {
      type: 'plain',
      config: 'english',
    });
  }

  // Filter by category/verdict if provided
  if (category) {
    dbQuery = dbQuery.eq('verdict', category);
  }

  // Add pagination and ordering (most recent first)
  dbQuery = dbQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search submissions: ${error.message}`);
  }

  return (data as SubmissionWithUser[]).map(toCommunitySubmission);
}

/**
 * Get submissions by listing URL
 */
export async function getSubmissionsByListingUrl(
  client: SupabaseClient,
  listingUrl: string
): Promise<CommunitySubmission[]> {
  const urlHash = await hashListingUrl(listingUrl);

  const { data, error } = await client
    .from(tables.submissions)
    .select(`
      *,
      users (reputation)
    `)
    .eq('listing_url_hash', urlHash)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch submissions by URL: ${error.message}`);
  }

  return (data as SubmissionWithUser[]).map(toCommunitySubmission);
}

/**
 * Get recent submissions
 */
export async function getRecentSubmissions(
  client: SupabaseClient,
  limit = 20,
  offset = 0
): Promise<CommunitySubmission[]> {
  const { data, error } = await client
    .from(tables.submissions)
    .select(`
      *,
      users (reputation)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch recent submissions: ${error.message}`);
  }

  return (data as SubmissionWithUser[]).map(toCommunitySubmission);
}

/**
 * Get submissions by user
 */
export async function getSubmissionsByUser(
  client: SupabaseClient,
  userId: string,
  limit = 20,
  offset = 0
): Promise<CommunitySubmission[]> {
  const { data, error } = await client
    .from(tables.submissions)
    .select(`
      *,
      users (reputation)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch user submissions: ${error.message}`);
  }

  return (data as SubmissionWithUser[]).map(toCommunitySubmission);
}

/**
 * Vote on a submission
 */
export async function voteOnSubmission(
  client: SupabaseClient,
  submissionId: string,
  userId: string,
  voteType: 'up' | 'down'
): Promise<{ upvotes: number; downvotes: number }> {
  // Upsert the vote (update if exists, insert if not)
  const { error: voteError } = await client
    .from(tables.votes)
    .upsert(
      {
        user_id: userId,
        submission_id: submissionId,
        vote_type: voteType,
      },
      { onConflict: 'user_id,submission_id' }
    );

  if (voteError) {
    throw new Error(`Failed to record vote: ${voteError.message}`);
  }

  // Recalculate vote counts
  const { data: upCount } = await client
    .from(tables.votes)
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
    .eq('vote_type', 'up');

  const { data: downCount } = await client
    .from(tables.votes)
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
    .eq('vote_type', 'down');

  const upvotes = (upCount as unknown as { count: number })?.count || 0;
  const downvotes = (downCount as unknown as { count: number })?.count || 0;

  // Update the submission with new counts
  await client
    .from(tables.submissions)
    .update({ upvotes, downvotes })
    .eq('id', submissionId);

  return { upvotes, downvotes };
}

/**
 * Remove a vote from a submission
 */
export async function removeVote(
  client: SupabaseClient,
  submissionId: string,
  userId: string
): Promise<{ upvotes: number; downvotes: number }> {
  await client
    .from(tables.votes)
    .delete()
    .eq('user_id', userId)
    .eq('submission_id', submissionId);

  // Recalculate and update counts
  const { count: upvotes } = await client
    .from(tables.votes)
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
    .eq('vote_type', 'up');

  const { count: downvotes } = await client
    .from(tables.votes)
    .select('*', { count: 'exact', head: true })
    .eq('submission_id', submissionId)
    .eq('vote_type', 'down');

  await client
    .from(tables.submissions)
    .update({ upvotes: upvotes || 0, downvotes: downvotes || 0 })
    .eq('id', submissionId);

  return { upvotes: upvotes || 0, downvotes: downvotes || 0 };
}

/**
 * Delete a submission (admin/owner only)
 */
export async function deleteSubmission(
  client: SupabaseClient,
  id: string,
  userId?: string
): Promise<boolean> {
  let query = client
    .from(tables.submissions)
    .delete()
    .eq('id', id);

  // If userId provided, only allow deleting own submissions
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to delete submission: ${error.message}`);
  }

  return true;
}

/**
 * Count total submissions
 */
export async function countSubmissions(
  client: SupabaseClient,
  verdict?: string
): Promise<number> {
  let query = client
    .from(tables.submissions)
    .select('*', { count: 'exact', head: true });

  if (verdict) {
    query = query.eq('verdict', verdict);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count submissions: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get top rated submissions
 */
export async function getTopSubmissions(
  client: SupabaseClient,
  limit = 10
): Promise<CommunitySubmission[]> {
  const { data, error } = await client
    .from(tables.submissions)
    .select(`
      *,
      users (reputation)
    `)
    .order('upvotes', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch top submissions: ${error.message}`);
  }

  return (data as SubmissionWithUser[]).map(toCommunitySubmission);
}
