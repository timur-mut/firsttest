import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';
import {
  STORAGE_KEY,
  autosave,
  cancelAutosave,
  clearLocal,
  loadFromLocal,
  saveToLocal,
} from './storage';

afterEach(() => {
  localStorage.clear();
  cancelAutosave();
  vi.useRealTimers();
});

describe('saveToLocal / loadFromLocal', () => {
  it('round-trips a scene through localStorage', () => {
    const scene = makeSampleScene();
    saveToLocal(scene);

    const loaded = loadFromLocal();
    expect(loaded).not.toBeNull();

    const layerId = scene.selectedLayer;
    expect(loaded!.layers[layerId].lines).toEqual(scene.layers[layerId].lines);
    expect(loaded!.layers[layerId].holes).toEqual(scene.layers[layerId].holes);
    expect(loaded!.layers[layerId].items).toEqual(scene.layers[layerId].items);
  });

  it('returns null when nothing is stored', () => {
    expect(loadFromLocal()).toBeNull();
  });

  it('returns null (never throws) on corrupt stored data', () => {
    localStorage.setItem(STORAGE_KEY, '{ corrupt');
    expect(loadFromLocal()).toBeNull();
  });

  it('saveToLocal never throws even if serialize would fail', () => {
    // A scene with a circular reference cannot be JSON-stringified.
    const scene = makeSampleScene() as unknown as Record<string, unknown>;
    scene.self = scene;
    expect(() => saveToLocal(scene as never)).not.toThrow();
  });
});

describe('clearLocal', () => {
  it('removes a persisted scene', () => {
    saveToLocal(makeSampleScene());
    expect(loadFromLocal()).not.toBeNull();
    clearLocal();
    expect(loadFromLocal()).toBeNull();
  });
});

describe('autosave', () => {
  it('debounces repeated calls into a single write', () => {
    vi.useFakeTimers();
    const scene = makeSampleScene();

    autosave(scene, 500);
    autosave(scene, 500);
    autosave(scene, 500);

    // Nothing written before the delay elapses.
    expect(loadFromLocal()).toBeNull();

    vi.advanceTimersByTime(500);
    expect(loadFromLocal()).not.toBeNull();
  });

  it('cancelAutosave prevents a pending write', () => {
    vi.useFakeTimers();
    autosave(makeSampleScene(), 500);
    cancelAutosave();
    vi.advanceTimersByTime(500);
    expect(loadFromLocal()).toBeNull();
  });
});
