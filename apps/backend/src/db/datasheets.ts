/**
 * Datasheet Database Operations
 *
 * CRUD operations for component datasheets.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { tables } from './client';
import type { DatasheetResponse, SpecValue, DatasheetMatch } from '../routes/types';

/**
 * Database row type (snake_case from PostgreSQL)
 */
interface DatasheetRow {
  part_number: string;
  manufacturer: string;
  category: string;
  specs: Record<string, SpecValue>;
  datasheet_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to API response format
 */
function toDatasheetResponse(row: DatasheetRow): DatasheetResponse {
  return {
    partNumber: row.part_number,
    manufacturer: row.manufacturer,
    category: row.category,
    specs: row.specs,
    datasheetUrl: row.datasheet_url || '',
    lastUpdated: new Date(row.updated_at).getTime(),
  };
}

/**
 * Get a datasheet by part number
 */
export async function getDatasheetByPartNumber(
  client: SupabaseClient,
  partNumber: string
): Promise<DatasheetResponse | null> {
  const { data, error } = await client
    .from(tables.datasheets)
    .select('*')
    .eq('part_number', partNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw new Error(`Failed to fetch datasheet: ${error.message}`);
  }

  return toDatasheetResponse(data as DatasheetRow);
}

/**
 * Search datasheets using full-text search
 */
export async function searchDatasheets(
  client: SupabaseClient,
  query: string,
  category?: string,
  limit = 20,
  offset = 0
): Promise<DatasheetResponse[]> {
  // Build the query
  let dbQuery = client
    .from(tables.datasheets)
    .select('*');

  // Add full-text search if query provided
  if (query && query.trim()) {
    // Use plainto_tsquery for user-friendly search
    dbQuery = dbQuery.textSearch('search_vector', query, {
      type: 'plain',
      config: 'english',
    });
  }

  // Filter by category if provided
  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }

  // Add pagination and ordering
  dbQuery = dbQuery
    .order('manufacturer', { ascending: true })
    .order('part_number', { ascending: true })
    .range(offset, offset + limit - 1);

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search datasheets: ${error.message}`);
  }

  return (data as DatasheetRow[]).map(toDatasheetResponse);
}

/**
 * Get all datasheets with pagination
 */
export async function getAllDatasheets(
  client: SupabaseClient,
  limit = 50,
  offset = 0
): Promise<DatasheetResponse[]> {
  const { data, error } = await client
    .from(tables.datasheets)
    .select('*')
    .order('category', { ascending: true })
    .order('manufacturer', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch datasheets: ${error.message}`);
  }

  return (data as DatasheetRow[]).map(toDatasheetResponse);
}

/**
 * Get datasheets by category
 */
export async function getDatasheetsByCategory(
  client: SupabaseClient,
  category: string,
  limit = 50,
  offset = 0
): Promise<DatasheetResponse[]> {
  const { data, error } = await client
    .from(tables.datasheets)
    .select('*')
    .eq('category', category)
    .order('manufacturer', { ascending: true })
    .order('part_number', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch datasheets by category: ${error.message}`);
  }

  return (data as DatasheetRow[]).map(toDatasheetResponse);
}

/**
 * Identify component from text lines (OCR output)
 * Returns potential matches with confidence scores
 */
export async function identifyComponent(
  client: SupabaseClient,
  textLines: string[],
  categoryHint?: string
): Promise<DatasheetMatch[]> {
  // Combine text lines and clean up for search
  const combinedText = textLines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ');

  if (!combinedText) {
    return [];
  }

  // Extract potential part numbers (alphanumeric sequences)
  const partNumberPatterns = combinedText.match(/[A-Z0-9]{3,}[-]?[A-Z0-9]*/gi) || [];

  const matches: DatasheetMatch[] = [];
  const seen = new Set<string>();

  // Try exact match on extracted part numbers first
  for (const pattern of partNumberPatterns) {
    const { data } = await client
      .from(tables.datasheets)
      .select('part_number, manufacturer, category')
      .ilike('part_number', `%${pattern}%`)
      .limit(5);

    if (data) {
      for (const row of data) {
        const key = row.part_number;
        if (seen.has(key)) continue;
        seen.add(key);

        // Skip if category hint provided and doesn't match
        if (categoryHint && row.category !== categoryHint) {
          continue;
        }

        // Calculate confidence based on match quality
        const exactMatch = row.part_number.toUpperCase() === pattern.toUpperCase();
        const containsMatch = row.part_number.toUpperCase().includes(pattern.toUpperCase());

        let confidence = 0.5;
        if (exactMatch) {
          confidence = 0.95;
        } else if (containsMatch) {
          confidence = 0.7 + (pattern.length / row.part_number.length) * 0.2;
        }

        matches.push({
          partNumber: row.part_number,
          manufacturer: row.manufacturer,
          category: row.category,
          confidence: Math.min(confidence, 1.0),
        });
      }
    }
  }

  // Fall back to full-text search if no direct matches
  if (matches.length === 0) {
    let query = client
      .from(tables.datasheets)
      .select('part_number, manufacturer, category')
      .textSearch('search_vector', combinedText, {
        type: 'plain',
        config: 'english',
      })
      .limit(10);

    if (categoryHint) {
      query = query.eq('category', categoryHint);
    }

    const { data } = await query;

    if (data) {
      for (const row of data) {
        matches.push({
          partNumber: row.part_number,
          manufacturer: row.manufacturer,
          category: row.category,
          confidence: 0.4, // Lower confidence for text search matches
        });
      }
    }
  }

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Create or update a datasheet
 */
export async function upsertDatasheet(
  client: SupabaseClient,
  datasheet: Omit<DatasheetResponse, 'lastUpdated'>
): Promise<DatasheetResponse> {
  const row = {
    part_number: datasheet.partNumber,
    manufacturer: datasheet.manufacturer,
    category: datasheet.category,
    specs: datasheet.specs,
    datasheet_url: datasheet.datasheetUrl || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(tables.datasheets)
    .upsert(row, { onConflict: 'part_number' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert datasheet: ${error.message}`);
  }

  return toDatasheetResponse(data as DatasheetRow);
}

/**
 * Delete a datasheet by part number
 */
export async function deleteDatasheet(
  client: SupabaseClient,
  partNumber: string
): Promise<boolean> {
  const { error } = await client
    .from(tables.datasheets)
    .delete()
    .eq('part_number', partNumber);

  if (error) {
    throw new Error(`Failed to delete datasheet: ${error.message}`);
  }

  return true;
}

/**
 * Get multiple datasheets by part numbers
 */
export async function getDatasheetsByPartNumbers(
  client: SupabaseClient,
  partNumbers: string[]
): Promise<DatasheetResponse[]> {
  if (partNumbers.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from(tables.datasheets)
    .select('*')
    .in('part_number', partNumbers);

  if (error) {
    throw new Error(`Failed to fetch datasheets: ${error.message}`);
  }

  return (data as DatasheetRow[]).map(toDatasheetResponse);
}

/**
 * Count total datasheets
 */
export async function countDatasheets(
  client: SupabaseClient,
  category?: string
): Promise<number> {
  let query = client
    .from(tables.datasheets)
    .select('*', { count: 'exact', head: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count datasheets: ${error.message}`);
  }

  return count || 0;
}
