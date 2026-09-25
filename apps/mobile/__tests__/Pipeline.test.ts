/**
 * Pipeline Tests
 *
 * Covers the detector lifecycle: the detector singleton is released when the
 * app backgrounds, and the pipeline has to pick up a fresh one afterwards.
 */

import type { CameraFrame } from '@speccheck/shared-types';
import { Pipeline } from '../src/pipeline/Pipeline';
import { getComponentDetector, resetComponentDetector } from '../src/recognition/ComponentDetector';

class MockDetector {
  loaded = false;
  loadModel = jest.fn(async () => {
    this.loaded = true;
  });
  isReady() {
    return this.loaded;
  }
  detect = jest.fn(async () => {
    if (!this.loaded) throw new Error('Model not loaded. Call loadModel() first.');
    return { regions: [], inferenceTimeMs: 0 };
  });
  dispose() {
    this.loaded = false;
  }
}

let mockDetector: MockDetector | null = null;

jest.mock('../src/recognition/ComponentDetector', () => ({
  getComponentDetector: () => {
    if (!mockDetector) mockDetector = new MockDetector();
    return mockDetector;
  },
  resetComponentDetector: () => {
    mockDetector?.dispose();
    mockDetector = null;
  },
}));
jest.mock('../src/recognition/OCREngine', () => ({ getOCREngine: () => ({}) }));
jest.mock('../src/recognition/ComponentMatcher', () => ({ getComponentMatcher: () => ({}) }));
jest.mock('../src/datasheet/SpecRetriever', () => ({ getSpecRetriever: () => ({}) }));

const frame: CameraFrame = {
  id: 'frame-1',
  imageBase64: '',
  width: 100,
  height: 100,
  timestamp: 0,
  orientation: 0,
  isFullResolution: true,
};

describe('Pipeline', () => {
  beforeEach(() => {
    mockDetector = null;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the detector on initialize', async () => {
    const pipeline = new Pipeline();
    await pipeline.initialize();

    expect(getComponentDetector().isReady()).toBe(true);
  });

  it('keeps working after the detector is released in the background', async () => {
    const pipeline = new Pipeline();
    await pipeline.initialize();
    const before = getComponentDetector();

    resetComponentDetector();

    await expect(pipeline.processFrame(frame)).resolves.toEqual([]);
    const after = getComponentDetector();
    expect(after).not.toBe(before);
    expect(after.detect).toHaveBeenCalledTimes(1);
    expect(pipeline.getState().stage).toBe('complete');
  });

  it('loads the detector if a frame arrives before initialize finishes', async () => {
    const pipeline = new Pipeline();

    await expect(pipeline.processFrame(frame)).resolves.toEqual([]);
    expect(getComponentDetector().loadModel).toHaveBeenCalledTimes(1);
  });
});
