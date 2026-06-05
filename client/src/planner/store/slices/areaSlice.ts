// Area slice — owned by Unit 4 (Room/area detection).
//
// Rooms are derived from the wall graph, so their metadata (name, color) is
// stored in `layer.areas` keyed by the room's deterministic id (see `roomId`).
// The setters upsert that record — creating it from the currently detected room
// when it doesn't exist yet — so an override survives recomputation as long as
// the room's corners are unchanged.

import type { Area, Layer } from '../../contract/types';
import { detectAreas } from '../../utils/areaDetection';
import type { SliceCreator } from '../storeTypes';
import { getSelectedLayer } from '../helpers';

export interface AreaSlice {
  /** Override a room's fill color. */
  setAreaColor(areaId: string, color: string): void;
  /** Set (or clear) a room's user label. */
  setAreaName(areaId: string, name: string): void;
}

/** Apply a metadata patch to a room, creating the record if it doesn't exist. */
function upsertArea(layer: Layer, areaId: string, patch: Partial<Area>): void {
  const existing = layer.areas[areaId];
  if (existing) {
    Object.assign(existing, patch);
    return;
  }
  const detected = detectAreas(layer)[areaId];
  if (detected) layer.areas[areaId] = { ...detected, ...patch };
}

export const createAreaSlice: SliceCreator<AreaSlice> = (mutate) => ({
  setAreaColor: (areaId, color) =>
    mutate((draft) => {
      upsertArea(getSelectedLayer(draft.scene), areaId, { color });
    }),

  setAreaName: (areaId, name) =>
    mutate((draft) => {
      upsertArea(getSelectedLayer(draft.scene), areaId, { name: name.trim() });
    }),
});
