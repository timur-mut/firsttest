// ─────────────────────────────────────────────────────────────────────────────
// Canonical test fixture: two adjacent rectangular rooms sharing a middle wall,
// with one door and one window, plus a single sofa. Foundation-owned.
//
// EVERY unit tests against this scene so that "downstream" units (e.g. area
// detection) depend only on the data contract, never on another unit's code.
//
//   v1(100,100) ── v2(500,100) ── v3(900,100)
//      │              │               │
//      │   Room A     │    Room B      │
//      │              │               │
//   v6(100,400) ── v5(500,400) ── v4(900,400)
//
// Door on the left wall (v6->v1), window on the top-right wall (v2->v3).
// ─────────────────────────────────────────────────────────────────────────────

import type { Layer, Scene } from '../contract/types';

const DEFAULT_THICKNESS = 20;
const DEFAULT_HEIGHT = 280;

/** Build a fresh copy of the sample layer (deep, so tests never share state). */
function buildLayer(): Layer {
  return {
    id: 'layer-1',
    name: 'Ground floor',
    vertices: {
      v1: { id: 'v1', x: 100, y: 100, lines: ['l-top-left', 'l-left'] },
      v2: { id: 'v2', x: 500, y: 100, lines: ['l-top-left', 'l-top-right', 'l-mid'] },
      v3: { id: 'v3', x: 900, y: 100, lines: ['l-top-right', 'l-right'] },
      v4: { id: 'v4', x: 900, y: 400, lines: ['l-right', 'l-bottom-right'] },
      v5: { id: 'v5', x: 500, y: 400, lines: ['l-bottom-right', 'l-bottom-left', 'l-mid'] },
      v6: { id: 'v6', x: 100, y: 400, lines: ['l-bottom-left', 'l-left'] },
    },
    lines: {
      'l-top-left': mkWall('l-top-left', 'v1', 'v2'),
      'l-top-right': mkWall('l-top-right', 'v2', 'v3', ['h-window']),
      'l-right': mkWall('l-right', 'v3', 'v4'),
      'l-bottom-right': mkWall('l-bottom-right', 'v4', 'v5'),
      'l-bottom-left': mkWall('l-bottom-left', 'v5', 'v6'),
      'l-left': mkWall('l-left', 'v6', 'v1', ['h-door']),
      'l-mid': mkWall('l-mid', 'v2', 'v5'),
    },
    holes: {
      'h-door': {
        id: 'h-door',
        type: 'door',
        lineId: 'l-left',
        offset: 0.5,
        width: 90,
        height: 210,
        altitude: 0,
      },
      'h-window': {
        id: 'h-window',
        type: 'window',
        lineId: 'l-top-right',
        offset: 0.5,
        width: 120,
        height: 100,
        altitude: 90,
      },
    },
    items: {
      'i-sofa': {
        id: 'i-sofa',
        type: 'sofa',
        x: 300,
        y: 300,
        rotation: 0,
        width: 180,
        depth: 90,
        properties: { color: '#8b5cf6' },
      },
    },
    areas: {},
  };
}

function mkWall(id: string, a: string, b: string, holes: string[] = []) {
  return {
    id,
    type: 'wall' as const,
    vertices: [a, b] as [string, string],
    thickness: DEFAULT_THICKNESS,
    height: DEFAULT_HEIGHT,
    holes,
  };
}

/** A complete sample scene; returns a fresh deep copy on every call. */
export function makeSampleScene(): Scene {
  const layer = buildLayer();
  return {
    name: 'Sample Plan',
    width: 2000,
    height: 2000,
    layers: { [layer.id]: layer },
    selectedLayer: layer.id,
    meta: { unit: 'cm', pixelsPerUnit: 1 },
  };
}
