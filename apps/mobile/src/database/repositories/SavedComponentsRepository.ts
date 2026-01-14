import { db } from '../Database';
import { TABLES } from '../schema';
import type { ComponentSpecs, ComponentCategory } from '@speccheck/shared-types';

/**
 * Saved component with user annotations
 */
export interface SavedComponentEntry {
  id: number;
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  specs: Record<string, unknown>;
  notes: string | null;
  tags: string[];
  createdAt: number;
}

/**
 * Database row type
 */
interface SavedComponentRow {
  id: number;
  part_number: string;
  manufacturer: string;
  category: string;
  specs_json: string;
  notes: string | null;
  tags: string | null;
  created_at: number;
}

/**
 * Repository for user-saved components.
 *
 * Allows users to bookmark components for quick reference,
 * add personal notes, and organize with tags.
 */
export class SavedComponentsRepository {
  /**
   * Get all saved components.
   */
  async getAll(): Promise<SavedComponentEntry[]> {
    const rows = await db.query<SavedComponentRow>(
      `SELECT * FROM ${TABLES.SAVED_COMPONENTS} ORDER BY created_at DESC`
    );

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Get a saved component by ID.
   */
  async getById(id: number): Promise<SavedComponentEntry | null> {
    const row = await db.queryFirst<SavedComponentRow>(
      `SELECT * FROM ${TABLES.SAVED_COMPONENTS} WHERE id = ?`,
      [id]
    );

    if (!row) return null;

    return this.rowToEntry(row);
  }

  /**
   * Get saved component by part number.
   */
  async getByPartNumber(partNumber: string): Promise<SavedComponentEntry | null> {
    const row = await db.queryFirst<SavedComponentRow>(
      `SELECT * FROM ${TABLES.SAVED_COMPONENTS} WHERE part_number = ?`,
      [partNumber]
    );

    if (!row) return null;

    return this.rowToEntry(row);
  }

  /**
   * Check if a component is saved.
   */
  async isSaved(partNumber: string, manufacturer: string): Promise<boolean> {
    const result = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.SAVED_COMPONENTS}
       WHERE part_number = ? AND manufacturer = ?`,
      [partNumber, manufacturer]
    );

    return (result?.count ?? 0) > 0;
  }

  /**
   * Get saved components by category.
   */
  async getByCategory(category: ComponentCategory): Promise<SavedComponentEntry[]> {
    const rows = await db.query<SavedComponentRow>(
      `SELECT * FROM ${TABLES.SAVED_COMPONENTS}
       WHERE category = ?
       ORDER BY created_at DESC`,
      [category]
    );

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Get saved components by tag.
   */
  async getByTag(tag: string): Promise<SavedComponentEntry[]> {
    const tagPattern = `%"${tag}"%`;

    const rows = await db.query<SavedComponentRow>(
      `SELECT * FROM ${TABLES.SAVED_COMPONENTS}
       WHERE tags LIKE ?
       ORDER BY created_at DESC`,
      [tagPattern]
    );

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Search saved components.
   */
  async search(query: string): Promise<SavedComponentEntry[]> {
    const searchPattern = `%${query}%`;

    const rows = await db.query<SavedComponentRow>(
      `SELECT * FROM ${TABLES.SAVED_COMPONENTS}
       WHERE part_number LIKE ? OR manufacturer LIKE ? OR notes LIKE ?
       ORDER BY created_at DESC`,
      [searchPattern, searchPattern, searchPattern]
    );

    return rows.map((row) => this.rowToEntry(row));
  }

  /**
   * Save a component.
   */
  async save(
    component: ComponentSpecs,
    notes?: string,
    tags?: string[]
  ): Promise<number> {
    const now = Date.now();

    const result = await db.run(
      `INSERT INTO ${TABLES.SAVED_COMPONENTS}
       (part_number, manufacturer, category, specs_json, notes, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(part_number, manufacturer) DO UPDATE SET
         specs_json = excluded.specs_json,
         notes = COALESCE(excluded.notes, notes),
         tags = COALESCE(excluded.tags, tags)`,
      [
        component.partNumber,
        component.manufacturer,
        component.category,
        JSON.stringify(component.specs),
        notes ?? null,
        tags ? JSON.stringify(tags) : null,
        now,
      ]
    );

    return result.lastInsertRowId;
  }

  /**
   * Update notes for a saved component.
   */
  async updateNotes(id: number, notes: string): Promise<boolean> {
    const result = await db.run(
      `UPDATE ${TABLES.SAVED_COMPONENTS} SET notes = ? WHERE id = ?`,
      [notes, id]
    );

    return result.changes > 0;
  }

  /**
   * Update tags for a saved component.
   */
  async updateTags(id: number, tags: string[]): Promise<boolean> {
    const result = await db.run(
      `UPDATE ${TABLES.SAVED_COMPONENTS} SET tags = ? WHERE id = ?`,
      [JSON.stringify(tags), id]
    );

    return result.changes > 0;
  }

  /**
   * Add a tag to a saved component.
   */
  async addTag(id: number, tag: string): Promise<boolean> {
    const entry = await this.getById(id);
    if (!entry) return false;

    if (entry.tags.includes(tag)) return true;

    const newTags = [...entry.tags, tag];
    return this.updateTags(id, newTags);
  }

  /**
   * Remove a tag from a saved component.
   */
  async removeTag(id: number, tag: string): Promise<boolean> {
    const entry = await this.getById(id);
    if (!entry) return false;

    const newTags = entry.tags.filter((t) => t !== tag);
    return this.updateTags(id, newTags);
  }

  /**
   * Remove a saved component.
   */
  async remove(id: number): Promise<boolean> {
    const result = await db.run(
      `DELETE FROM ${TABLES.SAVED_COMPONENTS} WHERE id = ?`,
      [id]
    );

    return result.changes > 0;
  }

  /**
   * Remove by part number.
   */
  async removeByPartNumber(partNumber: string, manufacturer: string): Promise<boolean> {
    const result = await db.run(
      `DELETE FROM ${TABLES.SAVED_COMPONENTS}
       WHERE part_number = ? AND manufacturer = ?`,
      [partNumber, manufacturer]
    );

    return result.changes > 0;
  }

  /**
   * Clear all saved components.
   */
  async clearAll(): Promise<void> {
    await db.run(`DELETE FROM ${TABLES.SAVED_COMPONENTS}`);
  }

  /**
   * Get count of saved components.
   */
  async getCount(): Promise<number> {
    const result = await db.queryFirst<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLES.SAVED_COMPONENTS}`
    );

    return result?.count ?? 0;
  }

  /**
   * Get all unique tags.
   */
  async getAllTags(): Promise<string[]> {
    const rows = await db.query<{ tags: string }>(
      `SELECT DISTINCT tags FROM ${TABLES.SAVED_COMPONENTS} WHERE tags IS NOT NULL`
    );

    const allTags = new Set<string>();
    for (const row of rows) {
      const tags: string[] = JSON.parse(row.tags);
      tags.forEach((tag) => allTags.add(tag));
    }

    return Array.from(allTags).sort();
  }

  /**
   * Convert database row to entry type.
   */
  private rowToEntry(row: SavedComponentRow): SavedComponentEntry {
    return {
      id: row.id,
      partNumber: row.part_number,
      manufacturer: row.manufacturer,
      category: row.category as ComponentCategory,
      specs: JSON.parse(row.specs_json),
      notes: row.notes,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const savedComponents = new SavedComponentsRepository();
