/**
 * DatasheetAPI Tests
 *
 * Lookups must give up on a stalled connection and must not touch the
 * network at all when Offline Mode is on.
 */

import { DatasheetAPI } from '../src/datasheet/DatasheetAPI';
import { useAppStore } from '../src/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const datasheet = {
  partNumber: 'PT4115',
  manufacturer: 'PowTech',
  category: 'led_driver',
  specs: {},
  datasheetUrl: null,
  lastUpdated: 0,
};

function setOfflineOnly(offlineOnly: boolean) {
  useAppStore.getState().updateSettings({ offlineOnly });
}

describe('DatasheetAPI', () => {
  const fetchMock = jest.fn();
  const api = new DatasheetAPI('https://api.test');

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    setOfflineOnly(false);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns specs from the API', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(datasheet), { status: 200 }));

    const specs = await api.getByPartNumber('PT4115');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/datasheet/PT4115',
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(specs?.partNumber).toBe('PT4115');
    expect(specs?.source).toBe('api');
  });

  it('returns null for an unknown part', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));

    await expect(api.getByPartNumber('NOPE')).resolves.toBeNull();
  });

  it('gives up on a request that never answers', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          });
        })
    );

    const lookup = api.getByPartNumber('PT4115');
    jest.advanceTimersByTime(10000);

    await expect(lookup).resolves.toBeNull();
  });

  describe('with Offline Mode on', () => {
    beforeEach(() => setOfflineOnly(true));

    it('does not call the network for any lookup', async () => {
      await expect(api.getByPartNumber('PT4115')).resolves.toBeNull();
      await expect(api.search({ query: 'PT4115' })).resolves.toEqual({ matches: [], totalCount: 0 });
      await expect(api.identify({ textLines: ['PT4115'] })).resolves.toEqual({
        matches: [],
        confidence: 0,
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
