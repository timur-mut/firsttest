import { describe, expect, it } from 'vitest';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';
import {
  SCENE_FORMAT_VERSION,
  deserializeScene,
  migrate,
  serializeScene,
} from './serialize';

describe('serializeScene / deserializeScene', () => {
  it('round-trips a scene preserving walls, holes and items', () => {
    const scene = makeSampleScene();
    const result = deserializeScene(serializeScene(scene));

    const layerId = scene.selectedLayer;
    const src = scene.layers[layerId];
    const out = result.layers[layerId];

    expect(out.vertices).toEqual(src.vertices);
    expect(out.lines).toEqual(src.lines);
    expect(out.holes).toEqual(src.holes);
    expect(out.items).toEqual(src.items);
    expect(result.name).toBe(scene.name);
    expect(result.meta).toEqual(scene.meta);
    expect(result.selectedLayer).toBe(scene.selectedLayer);
  });

  it('writes the current format version', () => {
    const parsed = JSON.parse(serializeScene(makeSampleScene())) as {
      version: number;
    };
    expect(parsed.version).toBe(SCENE_FORMAT_VERSION);
  });

  it('strips derived areas on serialize but yields a valid empty areas map', () => {
    const scene = makeSampleScene();
    const layerId = scene.selectedLayer;
    // Pretend area detection populated rooms.
    scene.layers[layerId].areas = {
      'a-1': { id: 'a-1', vertices: ['v1', 'v2', 'v5', 'v6'], area: 1, color: '#fff' },
    };

    const json = serializeScene(scene);
    expect(json).not.toContain('a-1');

    const result = deserializeScene(json);
    expect(result.layers[layerId].areas).toEqual({});
  });

  it('accepts a file that has no areas key at all', () => {
    const scene = makeSampleScene();
    const layerId = scene.selectedLayer;
    const json = serializeScene(scene);
    const parsed = JSON.parse(json);
    delete parsed.scene.layers[layerId].areas;

    const result = deserializeScene(JSON.stringify(parsed));
    expect(result.layers[layerId].areas).toEqual({});
  });

  it('throws on malformed JSON', () => {
    expect(() => deserializeScene('{ not json')).toThrow(/JSON/);
  });

  it('throws when the scene key is missing', () => {
    expect(() => deserializeScene(JSON.stringify({ version: 1 }))).toThrow(
      /missing scene/,
    );
  });

  it('throws when the scene is structurally invalid (missing layers)', () => {
    const bad = JSON.stringify({
      version: 1,
      scene: { name: 'x', width: 1, height: 1, selectedLayer: 'l', meta: { unit: 'cm', pixelsPerUnit: 1 } },
    });
    expect(() => deserializeScene(bad)).toThrow(/layers/);
  });

  it('throws when selectedLayer points at an unknown layer', () => {
    const scene = makeSampleScene();
    scene.selectedLayer = 'does-not-exist';
    const json = serializeScene(scene);
    expect(() => deserializeScene(json)).toThrow(/unknown layer/);
  });

  it('migrates unversioned (v0) input as v1 identity', () => {
    const scene = makeSampleScene();
    const json = JSON.stringify({ scene }); // no version => treated as legacy
    const result = deserializeScene(json);
    expect(result.layers[scene.selectedLayer].items).toEqual(
      scene.layers[scene.selectedLayer].items,
    );
  });

  it('migrate is identity for the current version', () => {
    const scene = makeSampleScene();
    expect(migrate(scene, SCENE_FORMAT_VERSION)).toBe(scene);
  });
});
