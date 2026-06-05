// Shared store helpers. Foundation-owned. Imported by feature slices.

import type { Layer, Scene, Selection } from '../contract/types';
import { detectAreas } from '../utils/areaDetection';

/** An empty typed selection (all buckets empty). */
export function emptySelection(): Selection {
  return { vertices: [], lines: [], holes: [], items: [], areas: [] };
}

/** A blank single-layer scene for "new project". */
export function makeEmptyScene(name = 'Untitled Plan'): Scene {
  const layerId = 'layer-1';
  return {
    name,
    width: 2000,
    height: 2000,
    layers: {
      [layerId]: {
        id: layerId,
        name: 'Ground floor',
        vertices: {},
        lines: {},
        holes: {},
        items: {},
        areas: {},
      },
    },
    selectedLayer: layerId,
    meta: { unit: 'cm', pixelsPerUnit: 1 },
  };
}

/** The layer currently being edited. */
export function getSelectedLayer(scene: Scene): Layer {
  return scene.layers[scene.selectedLayer];
}

/**
 * Recompute derived data (rooms) for a layer IN PLACE. Feature slices that
 * mutate walls/vertices should call this at the end of their mutation recipe so
 * the whole edit + recompute is a single undo step.
 */
export function applyDerived(layer: Layer): void {
  layer.areas = detectAreas(layer);
}
