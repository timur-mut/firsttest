// Unit 1 tests — viewport fit/reset behavior against the canonical sample scene.

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '@/planner/store';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';
import { getSelectedLayer } from '@/planner/store/helpers';
import { ZOOM_MIN, ZOOM_MAX } from '@/planner/config';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

const VW = 800;
const VH = 600;

// Sample scene content bbox: vertices span x:[100,900], y:[100,400]; the sofa
// (center 300,300, w180 d90 -> half 90) stays inside that, so the overall bbox
// is minX=100, minY=100, maxX=900, maxY=400 -> center (500, 250).
const BBOX = { minX: 100, minY: 100, maxX: 900, maxY: 400 };
const CENTER = {
  x: (BBOX.minX + BBOX.maxX) / 2, // 500
  y: (BBOX.minY + BBOX.maxY) / 2, // 250
};

function state() {
  return usePlannerStore.getState();
}

/** world -> screen for the current viewport transform. */
function worldToScreen(wx: number, wy: number) {
  const s = state();
  const scale = s.scene.meta.pixelsPerUnit * s.zoom;
  return { sx: wx * scale + s.pan.x, sy: wy * scale + s.pan.y };
}

describe('fitToContent', () => {
  it('frames every vertex of the sample scene within the viewport', () => {
    state().fitToContent(VW, VH);

    const layer = getSelectedLayer(state().scene);
    for (const v of Object.values(layer.vertices)) {
      const { sx, sy } = worldToScreen(v.x, v.y);
      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sx).toBeLessThanOrEqual(VW);
      expect(sy).toBeGreaterThanOrEqual(0);
      expect(sy).toBeLessThanOrEqual(VH);
    }
  });

  it('centers the content bbox at the viewport center', () => {
    state().fitToContent(VW, VH);
    const { sx, sy } = worldToScreen(CENTER.x, CENTER.y);
    expect(sx).toBeCloseTo(VW / 2, 6);
    expect(sy).toBeCloseTo(VH / 2, 6);
  });

  it('leaves ~10% padding around the content (does not over-zoom)', () => {
    state().fitToContent(VW, VH);

    // The limiting axis is x (width 800 world units). With 10% padding per side
    // the content width in screen px should be <= 80% of the viewport width.
    const left = worldToScreen(BBOX.minX, BBOX.minY);
    const right = worldToScreen(BBOX.maxX, BBOX.maxY);
    const screenW = right.sx - left.sx;
    expect(screenW).toBeLessThanOrEqual(VW * 0.8 + 1e-6);
    // And it should be close to that (we fit, not under-fill, on the tight axis).
    expect(screenW).toBeGreaterThan(VW * 0.7);
  });

  it('clamps zoom to ZOOM_MIN for a huge content bbox', () => {
    // Move two vertices very far apart so the required zoom underflows ZOOM_MIN.
    usePlannerStore.getState().setScene(
      (() => {
        const scene = makeSampleScene();
        const layer = scene.layers[scene.selectedLayer];
        layer.vertices.v1.x = -1_000_000;
        layer.vertices.v4.x = 1_000_000;
        return scene;
      })(),
    );
    usePlannerStore.getState().clearHistory();

    state().fitToContent(VW, VH);
    expect(state().zoom).toBe(ZOOM_MIN);
  });

  it('clamps zoom to ZOOM_MAX for tiny content', () => {
    usePlannerStore.getState().setScene(
      (() => {
        const scene = makeSampleScene();
        const layer = scene.layers[scene.selectedLayer];
        // Collapse all vertices and remove items so the bbox is a single point.
        for (const v of Object.values(layer.vertices)) {
          v.x = 10;
          v.y = 10;
        }
        layer.items = {};
        return scene;
      })(),
    );
    usePlannerStore.getState().clearHistory();

    state().fitToContent(VW, VH);
    expect(state().zoom).toBe(ZOOM_MAX);
  });

  it('resets to zoom 1 / pan 0 for an empty layer', () => {
    usePlannerStore.getState().setScene(
      (() => {
        const scene = makeSampleScene();
        const layer = scene.layers[scene.selectedLayer];
        layer.vertices = {};
        layer.lines = {};
        layer.holes = {};
        layer.items = {};
        layer.areas = {};
        return scene;
      })(),
    );
    usePlannerStore.getState().clearHistory();

    // Move the viewport first so we can prove it was reset.
    state().setPan(123, 456);
    state().setZoom(7);
    state().fitToContent(VW, VH);

    expect(state().zoom).toBe(1);
    expect(state().pan).toEqual({ x: 0, y: 0 });
  });

  it('does NOT create an undo step', () => {
    expect(state().canUndo()).toBe(false);
    state().fitToContent(VW, VH);
    expect(state().canUndo()).toBe(false);
  });
});

describe('resetView', () => {
  it('resets zoom to 1 and centers content at the world origin', () => {
    state().setZoom(5);
    state().setPan(999, 999);
    state().resetView();

    expect(state().zoom).toBe(1);
    // bbox center should map to screen origin (0,0).
    const { sx, sy } = worldToScreen(CENTER.x, CENTER.y);
    expect(sx).toBeCloseTo(0, 6);
    expect(sy).toBeCloseTo(0, 6);
  });

  it('pans to origin when the layer is empty', () => {
    usePlannerStore.getState().setScene(
      (() => {
        const scene = makeSampleScene();
        const layer = scene.layers[scene.selectedLayer];
        layer.vertices = {};
        layer.items = {};
        return scene;
      })(),
    );
    usePlannerStore.getState().clearHistory();

    state().setPan(50, 50);
    state().resetView();
    expect(state().zoom).toBe(1);
    expect(state().pan).toEqual({ x: 0, y: 0 });
  });

  it('does NOT create an undo step', () => {
    expect(state().canUndo()).toBe(false);
    state().resetView();
    expect(state().canUndo()).toBe(false);
  });
});
