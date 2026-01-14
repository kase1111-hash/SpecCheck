import { db } from '../Database';
import { TABLES, CACHE_TTL } from '../schema';
import type { Verdict, ComponentCategory } from '@speccheck/shared-types';

/**
 * Claim information stored with a scan
 */
export interface StoredClaim {
  raw: string;
  value: number | null;
  unit: string | null;
  type: string | null;
}

/**
 * Component detected during a scan
 */
export interface ScanComponent {
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  boundingBox?: { x: number; y: number; width: number; height: number };
  confidence: number;
}

/**
 * Full scan history entry
 */
export interface ScanHistoryEntry {
  id: number;
  claim: StoredClaim;
  verdict: Verdict;
  components: ScanComponent[];
  createdAt: number;
}

/**
 * Summary for list views
 */
export interface ScanHistorySummary {
  id: number;
  claimRaw: string;
  verdictType: Verdict['verdictType'];
  confidence: number;
  componentCount: number;
  createdAt: number;
}

/**
 * Database row types
 */
interface ScanHistoryRow {
  id: number;
  claim_raw: string;
  claim_value: number | null;
  claim_unit: string | null;
  claim_type: string | null;
  verdict_type: string;
  verdict_confidence: number;
  verdict_summary: string | null;
  verdict_explanation: string | null;
  verdict_json: string;
  component_count: number;
  created_at: number;
}

interface ScanComponentRow {
  id: number;
  scan_id: number;
  part_number: string;
  manufacturer: string;
  category: string;
  bounding_box_json: string | null;
  confidence: number;
}

/**
 * Repository for scan history persistence.
 *
 * Stores completed scans with their claims, verdicts, and detected components.
 * Automatically trims old entries to stay within storage limits.
 */
export class ScanHistoryRepository {
  /**
   * Get a scan by ID with all components.
   */
  async getById(id: number): Promise<ScanHistoryEntry | null> {
    const row = await db.queryFirst<ScanHistoryRow>(
      `SELECT * FROM ${TABLES.SCAN_HISTORY} WHERE id = ?`,
      [id]
    );

    if (!row) return null;

    const componentRows = await db.query<ScanComponentRow>(
      `SELECT * FROM ${TABLES.SCAN_COMPONENTS} WHERE scan_id = ?`,
      [id]
    );

    return this.rowToEntry(row, componentRows);
  }

  /**
   * Get recent scan summaries for list display.
   */
  async getRecent(limit = 50, offset = 0): Promise<ScanHistorySummary[]> {
    const rows = await db.query<ScanHistoryRow>(
      `SELECT * FROM ${TABLES.SCAN_HISTORY}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return rows.map((row) => ({
      id: row.id,
      claimRaw: row.claim_raw,
      verdictType: row.verdict_type as Verdict['verdictType'],
      confidence: row.verdict_confidence,
      componentCount: row.component_count,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get scans by verdict type.
   */
  async getByVerdictType(
    verdictType: Verdict['verdictType'],
    limit = 50
  ): Promise<ScanHistorySummary[]> {
    const rows = await db.query<ScanHistoryRow>(
      `SELECT * FROM ${TABLES.SCAN_HISTORY}
       WHERE verdict_type = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [verdictType, limit]
    );

    return rows.map((row) => ({
      id: row.id,
      claimRaw: row.claim_raw,
      verdictType: row.verdict_type as Verdict['verdictType'],
      confidence: row.verdict_confidence,
      componentCount: row.component_count,
      createdAt: row.created_at,
    }));
  }

  /**
   * Search scans by claim text.
   */
  async search(query: string, limit = 20): Promise<ScanHistorySummary[]> {
    const searchPattern = `%${query}%`;

    const rows = await db.query<ScanHistoryRow>(
      `SELECT * FROM ${TABLES.SCAN_HISTORY}
       WHERE claim_raw LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [searchPattern, limit]
    );

    return rows.map((row) => ({
      id: row.id,
      claimRaw: row.claim_raw,
      verdictType: row.verdict_type as Verdict['verdictType'],
      confidence: row.verdict_confidence,
      componentCount: row.component_count,
      createdAt: row.created_at,
    }));
  }

  /**
   * Save a new scan to history.
   */
  async save(
    claim: StoredClaim,
    verdict: Verdict,
    components: ScanComponent[]
  ): Promise<number> {
    const now = Date.now();

    return await db.transaction(async () => {
      // Insert scan record
      const result = await db.run(
        `INSERT INTO ${TABLES.SCAN_HISTORY}
         (claim_raw, claim_value, claim_unit, claim_type,
          verdict_type, verdict_confidence, verdict_summary, verdict_explanation,
          verdict_json, component_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          claim.raw,
          claim.value,
          claim.unit,
          claim.type,
          verdict.verdictType,
          verdict.confidence,
          verdict.summary,
          verdict.explanation,
          JSON.stringify(verdict),
          components.length,
          now,
        ]
      );

      const scanId = result.lastInsertRowId;

      // Insert components
      for (const component of components) {
        await db.run(
          `INSERT INTO ${TABLES.SCAN_COMPONENTS}
           (scan_id, part_number, manufacturer, category, bounding_box_json, confidence)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            scanId,
            component.partNumber,
            component.manufacturer,
            component.category,
            component.boundingBox ? JSON.stringify(component.boundingBox) : null,
            component.confidence,
          ]
        );
      }

      // Trim old entries if over limit
      await this.trimOldEntries();

      return scanId;
    });
  }

  /**
   * Delete a scan by ID.
   */
  async delete(id: number): Promise<boolean> {
    const result = await db.run(
      `DELETE FROM ${TABLES.SCAN_HISTORY} WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  /**
   * Clear all scan history.
   */
  async clearAll(): Promise<void> {
    await db.transaction(async () => {
      await db.run(`DELETE FROM ${TABLES.SCAN_COMPONENTS}`);
      await db.run(`DELETE FROM ${TABLES.SCAN_HISTORY}`);
    });
  }

  /**
   * Get total scan count.
   */
  async getCount(): Promise<number> {
    const result = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.SCAN_HISTORY}`
    );
    return result?.count ?? 0;
  }

  /**
   * Get scan statistics.
   */
  async getStats(): Promise<{
    totalScans: number;
    byVerdict: Record<string, number>;
    lastScanAt: number | null;
  }> {
    const totalResult = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.SCAN_HISTORY}`
    );

    const verdictResults = await db.query<{ verdict_type: string; count: number }>(
      `SELECT verdict_type, COUNT(*) as count FROM ${TABLES.SCAN_HISTORY}
       GROUP BY verdict_type`
    );

    const lastResult = await db.queryFirst<{ created_at: number }>(
      `SELECT created_at FROM ${TABLES.SCAN_HISTORY}
       ORDER BY created_at DESC LIMIT 1`
    );

    const byVerdict: Record<string, number> = {};
    for (const row of verdictResults) {
      byVerdict[row.verdict_type] = row.count;
    }

    return {
      totalScans: totalResult?.count ?? 0,
      byVerdict,
      lastScanAt: lastResult?.created_at ?? null,
    };
  }

  /**
   * Trim old entries to stay within limit.
   */
  private async trimOldEntries(): Promise<void> {
    const count = await this.getCount();

    if (count > CACHE_TTL.SCAN_HISTORY_MAX) {
      const toDelete = count - CACHE_TTL.SCAN_HISTORY_MAX;

      await db.run(
        `DELETE FROM ${TABLES.SCAN_HISTORY}
         WHERE id IN (
           SELECT id FROM ${TABLES.SCAN_HISTORY}
           ORDER BY created_at ASC
           LIMIT ?
         )`,
        [toDelete]
      );
    }
  }

  /**
   * Convert database rows to entry type.
   */
  private rowToEntry(row: ScanHistoryRow, componentRows: ScanComponentRow[]): ScanHistoryEntry {
    const components: ScanComponent[] = componentRows.map((c) => ({
      partNumber: c.part_number,
      manufacturer: c.manufacturer,
      category: c.category as ComponentCategory,
      boundingBox: c.bounding_box_json ? JSON.parse(c.bounding_box_json) : undefined,
      confidence: c.confidence,
    }));

    return {
      id: row.id,
      claim: {
        raw: row.claim_raw,
        value: row.claim_value,
        unit: row.claim_unit,
        type: row.claim_type,
      },
      verdict: JSON.parse(row.verdict_json),
      components,
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const scanHistory = new ScanHistoryRepository();
