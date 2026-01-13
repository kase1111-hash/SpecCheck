/**
 * UserDataManager
 *
 * Manages user data: export, deletion, and inspection.
 * Gives users full control over their data.
 */

import type { ScanRecord, SavedProduct } from '@speccheck/shared-types';

/**
 * All user data that can be exported
 */
export interface UserDataExport {
  exportedAt: number;
  version: string;
  scanHistory: ScanRecord[];
  savedProducts: SavedProduct[];
  preferences: Record<string, unknown>;
  consents: Array<{
    type: string;
    granted: boolean;
    grantedAt: number | null;
  }>;
}

/**
 * Data deletion options
 */
export interface DeletionOptions {
  scanHistory: boolean;
  savedProducts: boolean;
  cache: boolean;
  preferences: boolean;
  consents: boolean;
  everything: boolean;
}

/**
 * User Data Manager
 */
export class UserDataManager {
  /**
   * Export all user data as JSON
   */
  async exportAllData(): Promise<UserDataExport> {
    // TODO: Gather from all storage locations

    const exportData: UserDataExport = {
      exportedAt: Date.now(),
      version: '1.0.0',
      scanHistory: await this.getScanHistory(),
      savedProducts: await this.getSavedProducts(),
      preferences: await this.getPreferences(),
      consents: await this.getConsents(),
    };

    return exportData;
  }

  /**
   * Export data as downloadable JSON string
   */
  async exportAsJSON(): Promise<string> {
    const data = await this.exportAllData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Delete user data based on options
   */
  async deleteData(options: DeletionOptions): Promise<{
    deleted: string[];
    failed: string[];
  }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    if (options.everything) {
      options = {
        scanHistory: true,
        savedProducts: true,
        cache: true,
        preferences: true,
        consents: true,
        everything: true,
      };
    }

    if (options.scanHistory) {
      try {
        await this.deleteScanHistory();
        deleted.push('Scan history');
      } catch (e) {
        failed.push('Scan history');
      }
    }

    if (options.savedProducts) {
      try {
        await this.deleteSavedProducts();
        deleted.push('Saved products');
      } catch (e) {
        failed.push('Saved products');
      }
    }

    if (options.cache) {
      try {
        await this.deleteCache();
        deleted.push('Cache');
      } catch (e) {
        failed.push('Cache');
      }
    }

    if (options.preferences) {
      try {
        await this.deletePreferences();
        deleted.push('Preferences');
      } catch (e) {
        failed.push('Preferences');
      }
    }

    if (options.consents) {
      try {
        await this.deleteConsents();
        deleted.push('Consent records');
      } catch (e) {
        failed.push('Consent records');
      }
    }

    return { deleted, failed };
  }

  /**
   * Get data summary for display
   */
  async getDataSummary(): Promise<{
    scanCount: number;
    savedCount: number;
    cacheSize: string;
    oldestScan: number | null;
  }> {
    const scans = await this.getScanHistory();
    const saved = await this.getSavedProducts();

    return {
      scanCount: scans.length,
      savedCount: saved.length,
      cacheSize: await this.getCacheSize(),
      oldestScan: scans.length > 0
        ? Math.min(...scans.map((s) => s.timestamp))
        : null,
    };
  }

  // Private methods - TODO: Implement with actual storage

  private async getScanHistory(): Promise<ScanRecord[]> {
    // TODO: Query from SQLite
    return [];
  }

  private async getSavedProducts(): Promise<SavedProduct[]> {
    // TODO: Query from SQLite
    return [];
  }

  private async getPreferences(): Promise<Record<string, unknown>> {
    // TODO: Get from AsyncStorage
    return {};
  }

  private async getConsents(): Promise<Array<{ type: string; granted: boolean; grantedAt: number | null }>> {
    // TODO: Get from ConsentManager
    return [];
  }

  private async deleteScanHistory(): Promise<void> {
    // TODO: DELETE FROM scans
  }

  private async deleteSavedProducts(): Promise<void> {
    // TODO: DELETE FROM saved_products
  }

  private async deleteCache(): Promise<void> {
    // TODO: DELETE FROM datasheets
  }

  private async deletePreferences(): Promise<void> {
    // TODO: Clear AsyncStorage preferences
  }

  private async deleteConsents(): Promise<void> {
    // TODO: Clear consent records
  }

  private async getCacheSize(): Promise<string> {
    // TODO: Calculate actual size
    return '0 MB';
  }
}

/**
 * Singleton instance
 */
let managerInstance: UserDataManager | null = null;

/**
 * Get user data manager instance
 */
export function getUserDataManager(): UserDataManager {
  if (!managerInstance) {
    managerInstance = new UserDataManager();
  }
  return managerInstance;
}
