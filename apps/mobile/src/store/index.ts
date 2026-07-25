import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ComponentSpecs,
  ComponentWithSpecs,
  Claim,
  ConstraintChain,
  Verdict,
} from '@speccheck/shared-types';

// Scan history entry
export interface ScanHistoryEntry {
  id: string;
  timestamp: number;
  claim: Claim;
  components: ComponentWithSpecs[];
  verdict: Verdict;
  imageUri?: string;
}

// Saved component with user notes
export interface SavedComponent {
  id: string;
  component: ComponentSpecs;
  savedAt: number;
  notes?: string;
  tags?: string[];
}

// User settings
export interface AppSettings {
  analyticsEnabled: boolean;
  offlineOnly: boolean;
  autoDetect: boolean;
  hapticFeedback: boolean;
  saveScanImages: boolean;
  preferredUnits: 'metric' | 'imperial';
  theme: 'dark' | 'light' | 'system';
}

// App state interface
interface AppState {
  // Current scan state
  isScanning: boolean;
  currentClaim: Claim | null;
  detectedComponents: ComponentWithSpecs[];
  currentChain: ConstraintChain | null;
  currentVerdict: Verdict | null;

  // Persisted data
  scanHistory: ScanHistoryEntry[];
  savedComponents: SavedComponent[];
  settings: AppSettings;

  // Scan actions
  setIsScanning: (scanning: boolean) => void;
  setCurrentClaim: (claim: Claim | null) => void;
  setDetectedComponents: (components: ComponentWithSpecs[]) => void;
  setCurrentChain: (chain: ConstraintChain | null) => void;
  setCurrentVerdict: (verdict: Verdict | null) => void;
  clearCurrentScan: () => void;

  // History actions
  addToHistory: (entry: ScanHistoryEntry) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;

  // Saved components actions
  saveComponent: (component: ComponentSpecs, notes?: string) => void;
  unsaveComponent: (id: string) => void;
  updateComponentNotes: (id: string, notes: string) => void;
  isComponentSaved: (partNumber: string) => boolean;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  analyticsEnabled: false,
  offlineOnly: false,
  autoDetect: true,
  hapticFeedback: true,
  saveScanImages: false,
  preferredUnits: 'metric',
  theme: 'dark',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      isScanning: false,
      currentClaim: null,
      detectedComponents: [],
      currentChain: null,
      currentVerdict: null,
      scanHistory: [],
      savedComponents: [],
      settings: DEFAULT_SETTINGS,

      // Scan actions
      setIsScanning: (scanning) => set({ isScanning: scanning }),

      setCurrentClaim: (claim) => set({ currentClaim: claim }),

      setDetectedComponents: (components) => set({ detectedComponents: components }),

      setCurrentChain: (chain) => set({ currentChain: chain }),

      setCurrentVerdict: (verdict) => set({ currentVerdict: verdict }),

      clearCurrentScan: () =>
        set({
          isScanning: false,
          currentClaim: null,
          detectedComponents: [],
          currentChain: null,
          currentVerdict: null,
        }),

      // History actions
      addToHistory: (entry) =>
        set((state) => ({
          scanHistory: [entry, ...state.scanHistory].slice(0, 100), // Keep last 100
        })),

      removeFromHistory: (id) =>
        set((state) => ({
          scanHistory: state.scanHistory.filter((e) => e.id !== id),
        })),

      clearHistory: () => set({ scanHistory: [] }),

      // Saved components actions
      saveComponent: (component, notes) =>
        set((state) => {
          // Don't save duplicates
          if (state.savedComponents.some((s) => s.component.partNumber === component.partNumber)) {
            return state;
          }
          return {
            savedComponents: [
              {
                id: `saved-${Date.now()}`,
                component,
                savedAt: Date.now(),
                notes,
              },
              ...state.savedComponents,
            ],
          };
        }),

      unsaveComponent: (id) =>
        set((state) => ({
          savedComponents: state.savedComponents.filter((s) => s.id !== id),
        })),

      updateComponentNotes: (id, notes) =>
        set((state) => ({
          savedComponents: state.savedComponents.map((s) =>
            s.id === id ? { ...s, notes } : s
          ),
        })),

      isComponentSaved: (partNumber) =>
        get().savedComponents.some((s) => s.component.partNumber === partNumber),

      // Settings actions
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'speccheck-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        scanHistory: state.scanHistory,
        savedComponents: state.savedComponents,
        settings: state.settings,
      }),
    }
  )
);

// Selectors for performance optimization
export const useIsScanning = () => useAppStore((state) => state.isScanning);
export const useCurrentClaim = () => useAppStore((state) => state.currentClaim);
export const useSettings = () => useAppStore((state) => state.settings);
export const useScanHistory = () => useAppStore((state) => state.scanHistory);
export const useSavedComponents = () => useAppStore((state) => state.savedComponents);
