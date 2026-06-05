// Furniture slice — Unit 6 (Furniture placement).
// Interface FROZEN by the foundation; this unit implements the bodies.
//
// Furniture items are independent of walls/rooms, so no `applyDerived` call is
// needed. Each action mutates through `mutate`, which records exactly one undo
// step per scene change.

import type { Item } from '../../contract/types';
import { genId } from '../../contract/ids';
import type { SliceCreator } from '../storeTypes';
import { getSelectedLayer } from '../helpers';

export interface FurnitureSlice {
  /** Place a catalog item at a world point. Returns the new item id. */
  addItem(prototype: { type: string; width: number; depth: number; color: string }, x: number, y: number): string;
  /** Move an item to a new center. */
  moveItem(itemId: string, x: number, y: number): void;
  /** Rotate an item to an absolute angle (degrees). */
  rotateItem(itemId: string, rotation: number): void;
  /** Delete an item. */
  removeItem(itemId: string): void;
  /** Patch arbitrary item fields (dimensions, properties). */
  updateItem(itemId: string, patch: Partial<Pick<Item, 'width' | 'depth' | 'rotation' | 'properties'>>): void;
}

/** Normalize an arbitrary angle (degrees) into the [0, 360) range. */
function normalizeRotation(rotation: number): number {
  const r = rotation % 360;
  return r < 0 ? r + 360 : r;
}

export const createFurnitureSlice: SliceCreator<FurnitureSlice> = (mutate) => ({
  addItem: (prototype, x, y) => {
    const id = genId('item');
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      layer.items[id] = {
        id,
        type: prototype.type,
        x,
        y,
        rotation: 0,
        width: prototype.width,
        depth: prototype.depth,
        properties: { color: prototype.color },
      };
    });
    return id;
  },

  moveItem: (itemId, x, y) =>
    mutate((d) => {
      const item = getSelectedLayer(d.scene).items[itemId];
      if (!item) return;
      item.x = x;
      item.y = y;
    }),

  rotateItem: (itemId, rotation) =>
    mutate((d) => {
      const item = getSelectedLayer(d.scene).items[itemId];
      if (!item) return;
      item.rotation = normalizeRotation(rotation);
    }),

  removeItem: (itemId) =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      if (!layer.items[itemId]) return;
      delete layer.items[itemId];
    }),

  updateItem: (itemId, patch) =>
    mutate((d) => {
      const item = getSelectedLayer(d.scene).items[itemId];
      if (!item) return;
      if (patch.width !== undefined) item.width = patch.width;
      if (patch.depth !== undefined) item.depth = patch.depth;
      if (patch.rotation !== undefined) item.rotation = normalizeRotation(patch.rotation);
      if (patch.properties !== undefined) {
        item.properties = { ...item.properties, ...patch.properties };
      }
    }),
});
