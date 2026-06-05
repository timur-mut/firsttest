// Selection slice — STUB owned by Unit 6 (Selection + properties panel).
// Interface FROZEN by the foundation; Unit 6 implements the bodies.

import type { PrototypeKind, Selection } from '../../contract/types';
import type { SliceCreator } from '../storeTypes';

export interface SelectionSlice {
  /** Select one element; `additive` extends the current selection. */
  select(kind: PrototypeKind, id: string, additive?: boolean): void;
  /** Replace the whole selection at once. */
  selectMany(selection: Partial<Selection>): void;
  /** Clear all selection buckets. */
  clearSelection(): void;
  /** Delete every selected element (cascading orphans). */
  deleteSelected(): void;
}

export const createSelectionSlice: SliceCreator<SelectionSlice> = () => ({
  select: (_kind, _id, _additive) => {},
  selectMany: (_selection) => {},
  clearSelection: () => {},
  deleteSelected: () => {},
});
