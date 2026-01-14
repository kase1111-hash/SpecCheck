import { useState, useEffect, useCallback } from 'react';
import { componentCache } from './repositories/ComponentCacheRepository';
import { scanHistory, ScanHistorySummary, ScanHistoryEntry } from './repositories/ScanHistoryRepository';
import { savedComponents, SavedComponentEntry } from './repositories/SavedComponentsRepository';
import { datasheetCache } from './repositories/DatasheetCacheRepository';
import type { ComponentSpecs, ComponentCategory } from '@speccheck/shared-types';

/**
 * Hook for searching cached components.
 */
export function useComponentSearch(query: string, debounceMs = 300) {
  const [results, setResults] = useState<ComponentSpecs[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const data = await componentCache.search(query);
        setResults(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs]);

  return { results, loading, error };
}

/**
 * Hook for getting a cached component by part number.
 */
export function useCachedComponent(partNumber: string | null) {
  const [component, setComponent] = useState<ComponentSpecs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!partNumber) {
      setComponent(null);
      return;
    }

    setLoading(true);
    componentCache
      .getByPartNumber(partNumber)
      .then((data) => {
        setComponent(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch component'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [partNumber]);

  return { component, loading, error };
}

/**
 * Hook for scan history list.
 */
export function useScanHistory(limit = 50) {
  const [scans, setScans] = useState<ScanHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await scanHistory.getRecent(limit);
      setScans(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch history'));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteScan = useCallback(async (id: number) => {
    const success = await scanHistory.delete(id);
    if (success) {
      setScans((prev) => prev.filter((s) => s.id !== id));
    }
    return success;
  }, []);

  const clearAll = useCallback(async () => {
    await scanHistory.clearAll();
    setScans([]);
  }, []);

  return { scans, loading, error, refresh, deleteScan, clearAll };
}

/**
 * Hook for a single scan entry with full details.
 */
export function useScanEntry(id: number | null) {
  const [entry, setEntry] = useState<ScanHistoryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (id === null) {
      setEntry(null);
      return;
    }

    setLoading(true);
    scanHistory
      .getById(id)
      .then((data) => {
        setEntry(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch scan'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  return { entry, loading, error };
}

/**
 * Hook for saved components list.
 */
export function useSavedComponents() {
  const [components, setComponents] = useState<SavedComponentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await savedComponents.getAll();
      setComponents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch saved components'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveComponent = useCallback(async (component: ComponentSpecs, notes?: string) => {
    await savedComponents.save(component, notes);
    await refresh();
  }, [refresh]);

  const removeComponent = useCallback(async (id: number) => {
    const success = await savedComponents.remove(id);
    if (success) {
      setComponents((prev) => prev.filter((c) => c.id !== id));
    }
    return success;
  }, []);

  const updateNotes = useCallback(async (id: number, notes: string) => {
    const success = await savedComponents.updateNotes(id, notes);
    if (success) {
      setComponents((prev) =>
        prev.map((c) => (c.id === id ? { ...c, notes } : c))
      );
    }
    return success;
  }, []);

  return { components, loading, error, refresh, saveComponent, removeComponent, updateNotes };
}

/**
 * Hook to check if a component is saved.
 */
export function useIsComponentSaved(partNumber: string, manufacturer: string) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    savedComponents
      .isSaved(partNumber, manufacturer)
      .then(setIsSaved)
      .catch(() => setIsSaved(false));
  }, [partNumber, manufacturer]);

  const toggle = useCallback(async (component: ComponentSpecs) => {
    if (isSaved) {
      await savedComponents.removeByPartNumber(partNumber, manufacturer);
      setIsSaved(false);
    } else {
      await savedComponents.save(component);
      setIsSaved(true);
    }
  }, [isSaved, partNumber, manufacturer]);

  return { isSaved, toggle };
}

/**
 * Hook for database statistics.
 */
export function useDatabaseStats() {
  const [stats, setStats] = useState<{
    componentCache: { totalCount: number; expiredCount: number };
    scanHistory: { totalScans: number; byVerdict: Record<string, number> };
    savedComponents: number;
    datasheetCache: { totalCount: number; totalSizeBytes: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [compStats, scanStats, savedCount, dsStats] = await Promise.all([
        componentCache.getStats(),
        scanHistory.getStats(),
        savedComponents.getCount(),
        datasheetCache.getStats(),
      ]);

      setStats({
        componentCache: {
          totalCount: compStats.totalCount,
          expiredCount: compStats.expiredCount,
        },
        scanHistory: {
          totalScans: scanStats.totalScans,
          byVerdict: scanStats.byVerdict,
        },
        savedComponents: savedCount,
        datasheetCache: {
          totalCount: dsStats.totalCount,
          totalSizeBytes: dsStats.totalSizeBytes,
        },
      });
    } catch {
      // Stats are optional, don't fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}

/**
 * Hook to clean up expired cache entries.
 */
export function useCacheCleanup() {
  const [cleaning, setCleaning] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<{
    componentsRemoved: number;
    datasheetsRemoved: number;
  } | null>(null);

  const cleanup = useCallback(async () => {
    setCleaning(true);
    try {
      const [compRemoved, dsRemoved] = await Promise.all([
        componentCache.cleanExpired(),
        datasheetCache.cleanExpired(),
      ]);

      setLastCleanup({
        componentsRemoved: compRemoved,
        datasheetsRemoved: dsRemoved,
      });
    } finally {
      setCleaning(false);
    }
  }, []);

  return { cleanup, cleaning, lastCleanup };
}
