/**
 * Store Tests
 *
 * Saved components are keyed by id, so ids must stay unique even when one
 * scan saves several components in the same tick.
 */

import type { ComponentSpecs } from '@speccheck/shared-types';
import { useAppStore } from '../src/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const specs = (partNumber: string): ComponentSpecs => ({
  partNumber,
  manufacturer: 'Test',
  category: 'led',
  source: 'cache',
  specs: {},
  datasheetUrl: null,
  lastUpdated: 0,
});

describe('saved components', () => {
  beforeEach(() => {
    useAppStore.setState({ savedComponents: [] });
  });

  it('gives each component saved in one tick its own id', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const { saveComponent } = useAppStore.getState();

    saveComponent(specs('XM-L2'));
    saveComponent(specs('PT4115'));
    saveComponent(specs('INR18650-35E'));

    const ids = useAppStore.getState().savedComponents.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('removes only the component that was unsaved', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const { saveComponent } = useAppStore.getState();

    saveComponent(specs('XM-L2'));
    saveComponent(specs('PT4115'));

    const target = useAppStore
      .getState()
      .savedComponents.find((s) => s.component.partNumber === 'PT4115')!;
    useAppStore.getState().unsaveComponent(target.id);

    expect(useAppStore.getState().savedComponents.map((s) => s.component.partNumber)).toEqual([
      'XM-L2',
    ]);
  });
});
