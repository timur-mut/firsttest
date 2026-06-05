// Selection slice — owned by Unit 7 (Selection + properties panel).
// Interface FROZEN by the foundation; this file implements the bodies.
//
// Selection lives in core state as `selected: Selection` (one id bucket per
// PrototypeKind). Selection changes are NOT scene changes, so they never create
// undo steps. `deleteSelected()` DOES mutate the scene — it delegates to the
// existing remove actions (so cascades stay correct) and then clears selection.

import type { PrototypeKind, Selection } from '../../contract/types';
import { emptySelection } from '../helpers';
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

export const createSelectionSlice: SliceCreator<SelectionSlice> = (mutate, get) => ({
  select: (kind, id, additive = false) =>
    mutate((d) => {
      if (additive) {
        // Toggle this id within its bucket, leaving the other buckets intact.
        const bucket = d.selected[kind];
        d.selected[kind] = bucket.includes(id)
          ? bucket.filter((x) => x !== id)
          : [...bucket, id];
      } else {
        // Replace the whole selection with just this one element.
        d.selected = emptySelection();
        d.selected[kind] = [id];
      }
    }),

  selectMany: (selection) =>
    mutate((d) => {
      d.selected = { ...emptySelection(), ...selection };
    }),

  clearSelection: () =>
    mutate((d) => {
      d.selected = emptySelection();
    }),

  deleteSelected: () => {
    const { selected, removeItem, removeHole, removeLine } = get();
    // Delegate to the owning slices so cascades (orphan vertices/holes) are
    // handled correctly. Snapshot the ids first since each remove mutates state.
    for (const id of [...selected.items]) removeItem(id);
    for (const id of [...selected.holes]) removeHole(id);
    for (const id of [...selected.lines]) removeLine(id);
    get().clearSelection();
  },
});
