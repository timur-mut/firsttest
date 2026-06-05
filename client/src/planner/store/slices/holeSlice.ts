// Hole slice — owned by Unit 3 (Doors & windows).
// Interface FROZEN by the foundation; Unit 3 implements the bodies.

import type { Hole, HoleType, Layer } from '../../contract/types';
import { distance } from '../../contract/geometry';
import { genId } from '../../contract/ids';
import type { SliceCreator } from '../storeTypes';
import { getSelectedLayer } from '../helpers';

export interface HoleSlice {
  /** Add a hole to a line at a fractional offset [0,1]. Returns nothing. */
  addHole(lineId: string, type: HoleType, offset: number): void;
  /** Slide a hole along its line to a new fractional offset. */
  moveHole(holeId: string, offset: number): void;
  /** Delete a hole. */
  removeHole(holeId: string): void;
  /** Update editable hole properties (width/height/altitude). */
  updateHole(holeId: string, patch: Partial<{ width: number; height: number; altitude: number }>): void;
}

/** Sensible per-type defaults for a freshly placed hole. */
const HOLE_DEFAULTS: Record<HoleType, { width: number; height: number; altitude: number }> = {
  door: { width: 90, height: 210, altitude: 0 },
  window: { width: 120, height: 100, altitude: 90 },
};

/** Length in world units of the wall a hole sits on. */
function lineLength(layer: Layer, lineId: string): number {
  const line = layer.lines[lineId];
  if (!line) return 0;
  const a = layer.vertices[line.vertices[0]];
  const b = layer.vertices[line.vertices[1]];
  if (!a || !b) return 0;
  return distance(a.x, a.y, b.x, b.y);
}

/**
 * Clamp the fractional center offset so a hole of the given width stays fully
 * within the wall. With wall length L and hole width W the valid center offset
 * is [ (W/2)/L , 1 − (W/2)/L ]. Degenerate walls (or holes wider than the wall)
 * collapse to the midpoint.
 */
function clampOffset(offset: number, length: number, width: number): number {
  if (length <= 0) return 0.5;
  const margin = width / 2 / length;
  if (margin >= 0.5) return 0.5;
  return Math.max(margin, Math.min(1 - margin, offset));
}

export const createHoleSlice: SliceCreator<HoleSlice> = (mutate) => ({
  addHole: (lineId, type, offset) =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      const line = layer.lines[lineId];
      if (!line) return;
      const defaults = HOLE_DEFAULTS[type];
      const id = genId('hole');
      const hole: Hole = {
        id,
        type,
        lineId,
        offset: clampOffset(offset, lineLength(layer, lineId), defaults.width),
        width: defaults.width,
        height: defaults.height,
        altitude: defaults.altitude,
      };
      layer.holes[id] = hole;
      line.holes.push(id);
    }),

  moveHole: (holeId, offset) =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      const hole = layer.holes[holeId];
      if (!hole) return;
      hole.offset = clampOffset(offset, lineLength(layer, hole.lineId), hole.width);
    }),

  removeHole: (holeId) =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      const hole = layer.holes[holeId];
      if (!hole) return;
      const line = layer.lines[hole.lineId];
      if (line) line.holes = line.holes.filter((id) => id !== holeId);
      delete layer.holes[holeId];
    }),

  updateHole: (holeId, patch) =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      const hole = layer.holes[holeId];
      if (!hole) return;
      if (patch.width !== undefined) hole.width = patch.width;
      if (patch.height !== undefined) hole.height = patch.height;
      if (patch.altitude !== undefined) hole.altitude = patch.altitude;
      // A width change may invalidate the current offset; re-clamp.
      if (patch.width !== undefined) {
        hole.offset = clampOffset(hole.offset, lineLength(layer, hole.lineId), hole.width);
      }
    }),
});
