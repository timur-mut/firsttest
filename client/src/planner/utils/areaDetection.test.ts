// Unit 4 tests — room/area detection against the shared fixture and synthetic
// open/closed wall graphs.

import { describe, it, expect } from 'vitest';
import { detectAreas } from './areaDetection';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import type { Layer } from '../contract/types';

/** Build a minimal layer from vertices + wall edges (auto back-refs). */
function makeLayer(
  verts: Record<string, { x: number; y: number }>,
  edges: [string, string][],
): Layer {
  const vertices: Layer['vertices'] = {};
  for (const [id, p] of Object.entries(verts)) {
    vertices[id] = { id, x: p.x, y: p.y, lines: [] };
  }
  const lines: Layer['lines'] = {};
  edges.forEach(([a, b], i) => {
    const id = `l${i}`;
    lines[id] = {
      id,
      type: 'wall',
      vertices: [a, b],
      thickness: 20,
      height: 280,
      holes: [],
    };
    vertices[a].lines.push(id);
    vertices[b].lines.push(id);
  });
  return { id: 'L', name: 'L', vertices, lines, holes: {}, items: {}, areas: {} };
}

describe('detectAreas — sample scene', () => {
  it('finds exactly two rooms', () => {
    const layer = makeSampleScene().layers['layer-1'];
    const areas = detectAreas(layer);
    expect(Object.keys(areas)).toHaveLength(2);
  });

  it('detects the expected vertex cycles and areas (12 m² each)', () => {
    const layer = makeSampleScene().layers['layer-1'];
    const areas = Object.values(detectAreas(layer));

    const left = new Set(['v1', 'v2', 'v5', 'v6']);
    const right = new Set(['v2', 'v3', 'v4', 'v5']);

    const cyclesAsSets = areas.map((a) => new Set(a.vertices));
    // Each room is a 4-cycle.
    for (const a of areas) expect(a.vertices).toHaveLength(4);

    // Both expected rooms are present.
    expect(cyclesAsSets.some((s) => eqSet(s, left))).toBe(true);
    expect(cyclesAsSets.some((s) => eqSet(s, right))).toBe(true);

    // 400 × 300 = 120000 cm² = 12 m².
    for (const a of areas) expect(a.area).toBeCloseTo(120000, 5);
  });

  it('gives each room a default fill color', () => {
    const layer = makeSampleScene().layers['layer-1'];
    for (const a of Object.values(detectAreas(layer))) {
      expect(typeof a.color).toBe('string');
      expect(a.color.length).toBeGreaterThan(0);
    }
  });

  it('preserves an existing color override when the same cycle re-appears', () => {
    const layer = makeSampleScene().layers['layer-1'];
    const first = detectAreas(layer);
    // Apply a color override and feed it back as the layer's areas.
    const someId = Object.keys(first)[0];
    first[someId].color = '#ff0000';
    const layer2: Layer = { ...layer, areas: first };
    const second = detectAreas(layer2);
    const recolored = Object.values(second).find((a) =>
      eqSet(new Set(a.vertices), new Set(first[someId].vertices)),
    );
    expect(recolored?.color).toBe('#ff0000');
    // And the id is preserved for the matched cycle.
    expect(recolored?.id).toBe(someId);
  });
});

describe('detectAreas — synthetic graphs', () => {
  it('a single open (non-closed) wall chain yields 0 rooms', () => {
    const layer = makeLayer(
      { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, c: { x: 200, y: 0 } },
      [
        ['a', 'b'],
        ['b', 'c'],
      ],
    );
    expect(Object.keys(detectAreas(layer))).toHaveLength(0);
  });

  it('a single closed square yields 1 room with the correct area', () => {
    const layer = makeLayer(
      {
        a: { x: 0, y: 0 },
        b: { x: 100, y: 0 },
        c: { x: 100, y: 100 },
        d: { x: 0, y: 100 },
      },
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
        ['d', 'a'],
      ],
    );
    const areas = Object.values(detectAreas(layer));
    expect(areas).toHaveLength(1);
    expect(areas[0].vertices).toHaveLength(4);
    expect(areas[0].area).toBeCloseTo(10000, 5);
  });

  it('ignores dangling branches off a closed room', () => {
    const layer = makeLayer(
      {
        a: { x: 0, y: 0 },
        b: { x: 100, y: 0 },
        c: { x: 100, y: 100 },
        d: { x: 0, y: 100 },
        e: { x: 200, y: 0 }, // dangling spur off b
      },
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
        ['d', 'a'],
        ['b', 'e'],
      ],
    );
    const areas = Object.values(detectAreas(layer));
    expect(areas).toHaveLength(1);
    expect(areas[0].area).toBeCloseTo(10000, 5);
  });

  it('an empty layer yields 0 rooms', () => {
    const layer = makeLayer({}, []);
    expect(Object.keys(detectAreas(layer))).toHaveLength(0);
  });
});

function eqSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
