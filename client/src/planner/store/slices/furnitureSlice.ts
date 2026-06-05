// Furniture slice — STUB owned by Unit 5 (Catalog + placement).
// Interface FROZEN by the foundation; Unit 5 implements the bodies.

import type { Item } from '../../contract/types';
import type { SliceCreator } from '../storeTypes';

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

export const createFurnitureSlice: SliceCreator<FurnitureSlice> = () => ({
  addItem: (_prototype, _x, _y) => '',
  moveItem: (_itemId, _x, _y) => {},
  rotateItem: (_itemId, _rotation) => {},
  removeItem: (_itemId) => {},
  updateItem: (_itemId, _patch) => {},
});
