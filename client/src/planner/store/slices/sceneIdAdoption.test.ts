// Regression: loading a scene must advance the id counter past the scene's own
// ids, so the first entities a user draws can't re-issue an existing id and
// silently overwrite it. This previously broke edited/saved plans: drawing one
// interior wall on a freshly-loaded plan minted `vertex-2`/`line-3`, clobbering
// an existing corner and collapsing the room (its area vanished).

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '@/planner/store';
import { adoptIds, genId, resetIds } from '@/planner/contract/ids';
import { computeRooms } from '@/planner/utils/areaDetection';
import type { Scene } from '@/planner/contract/types';

// A two-room plan whose ids use the `prefix-N` shape genId produces (as an
// edited/saved plan would), with a shared mid wall and V-shaped bottoms.
function loadedPlan(): Scene {
  const v = (id: string, x: number, y: number, lines: string[]) => ({ id, x, y, lines });
  const w = (id: string, a: string, b: string) => ({
    id, type: 'wall' as const, vertices: [a, b] as [string, string], thickness: 20, height: 280, holes: [],
  });
  return {
    name: 'Loaded', width: 2000, height: 2000, selectedLayer: 'layer-1', meta: { unit: 'cm', pixelsPerUnit: 1 },
    layers: {
      'layer-1': {
        id: 'layer-1', name: 'G', areas: {}, holes: {}, items: {},
        vertices: {
          v1: v('v1', 100, 100, ['l-top-left', 'l-left']),
          v2: v('v2', 500, 100, ['l-top-left', 'l-top-right', 'l-mid']),
          v3: v('v3', 900, 100, ['l-top-right', 'l-right']),
          v4: v('v4', 900, 360, ['l-right', 'line-6']),
          v5: v('v5', 500, 420, ['l-mid', 'line-3', 'line-7']),
          v6: v('v6', 100, 420, ['l-left', 'line-4']),
          'vertex-2': v('vertex-2', 300, 480, ['line-3', 'line-4']),
          'vertex-5': v('vertex-5', 700, 360, ['line-6', 'line-7']),
        },
        lines: {
          'l-mid': w('l-mid', 'v2', 'v5'),
          'l-left': w('l-left', 'v6', 'v1'),
          'line-3': w('line-3', 'v5', 'vertex-2'),
          'line-4': w('line-4', 'vertex-2', 'v6'),
          'line-6': w('line-6', 'v4', 'vertex-5'),
          'line-7': w('line-7', 'vertex-5', 'v5'),
          'l-right': w('l-right', 'v3', 'v4'),
          'l-top-left': w('l-top-left', 'v1', 'v2'),
          'l-top-right': w('l-top-right', 'v2', 'v3'),
        },
      },
    },
  };
}

const covered = (s = usePlannerStore.getState().scene) =>
  computeRooms(s.layers[s.selectedLayer]).reduce((a, r) => a + r.area, 0);

describe('adoptIds', () => {
  it('advances the counter past the largest prefix-N suffix', () => {
    resetIds(0);
    adoptIds(['v1', 'vertex-2', 'line-7', 'hole-8', 'item-9', 'l-mid']);
    // next id must clear every numeric suffix seen (max was 9).
    expect(genId('line')).toBe('line-10');
  });

  it('ignores non-numeric ids and never lowers the counter', () => {
    resetIds(50);
    adoptIds(['l-mid', 'h-door', 'vertex-3']);
    expect(genId('vertex')).toBe('vertex-51');
  });
});

describe('loading a scene then drawing (id-collision regression)', () => {
  beforeEach(() => {
    resetIds(0); // simulate a fresh session (worst case for collisions)
  });

  it('drawing does not overwrite an existing corner or collapse the room', () => {
    usePlannerStore.getState().setScene(loadedPlan());
    const before = covered();
    expect(Math.round(before)).toBeGreaterThan(200000); // both rooms present

    // Draw a small interior wall in the left room. Pre-fix this minted
    // `vertex-2`, moving the existing corner and destroying the room.
    usePlannerStore.getState().beginWall(250, 250);
    usePlannerStore.getState().addWallPoint(350, 250);
    usePlannerStore.getState().finishWall();

    const corner = usePlannerStore.getState().scene.layers['layer-1'].vertices['vertex-2'];
    expect(corner).toBeDefined();
    expect([corner.x, corner.y]).toEqual([300, 480]); // untouched

    // The left room survives — only the drawn wall's footprint is subtracted.
    expect(covered()).toBeGreaterThan(195000);
  });
});
