/**
 * DatasheetCache Tests
 *
 * Built-in sample datasheets are for development only; release builds must
 * treat a cache miss as a miss so the lookup goes to the API.
 */

import { DatasheetCache } from '../src/datasheet/DatasheetCache';

// No native SQLite under Jest, so the cache runs on its in-memory fallback
jest.mock('expo-sqlite', () => {
  throw new Error('expo-sqlite is not available');
});

declare const global: { __DEV__?: boolean };

describe('DatasheetCache', () => {
  const originalDev = global.__DEV__;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('serves sample datasheets in development builds', async () => {
    global.__DEV__ = true;

    const specs = await new DatasheetCache().get('XM-L2');

    expect(specs?.partNumber).toBe('XM-L2');
  });

  it('returns a miss in release builds', async () => {
    global.__DEV__ = false;

    await expect(new DatasheetCache().get('XM-L2')).resolves.toBeNull();
  });
});
