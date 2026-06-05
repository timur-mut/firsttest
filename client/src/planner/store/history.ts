// ─────────────────────────────────────────────────────────────────────────────
// Snapshot-based undo/redo. FULLY IMPLEMENTED, foundation-owned.
//
// Only `scene` is tracked. Every slice mutates through `mutate` (below); when a
// mutation changes the scene reference, the previous scene is pushed onto the
// past stack. Transient operations (dragging a vertex/item) wrap their gesture
// in pauseHistory()/resumeHistory() so the whole drag becomes a single undo
// step instead of one per pointer-move.
//
// Implementing this as foundation infrastructure (not a late unit) is what
// keeps the feature slices decoupled — they never write undo logic.
// ─────────────────────────────────────────────────────────────────────────────

import { produce } from 'immer';
import type { Scene } from '../contract/types';
import { HISTORY_LIMIT } from '../config';
import type { Mutate, PlannerStore } from './storeTypes';

/** Undo/redo surface exposed on the store. */
export interface HistoryControls {
  undo(): void;
  redo(): void;
  clearHistory(): void;
  /** Begin a transient gesture; mutations until resume coalesce to one step. */
  pauseHistory(): void;
  /** End a transient gesture; records a single step if the scene changed. */
  resumeHistory(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

type RawSet = (
  partial:
    | Partial<PlannerStore>
    | ((state: PlannerStore) => Partial<PlannerStore> | PlannerStore),
  replace?: false,
) => void;
type RawGet = () => PlannerStore;

/**
 * Build the `mutate` function (handed to slices) and the undo/redo controls,
 * sharing the same paused/time-travel flags via closure.
 */
export function createHistory(set: RawSet, get: RawGet): {
  mutate: Mutate;
  controls: HistoryControls;
} {
  let paused = false;
  let pausedSnapshot: Scene | null = null;
  let timeTraveling = false;

  const pushPast = (before: Scene) => {
    set((s) => ({
      history: {
        past: [...s.history.past, before].slice(-HISTORY_LIMIT),
        future: [],
      },
    }));
  };

  const mutate: Mutate = (recipe) => {
    const before = get().scene;
    // `produce(recipe)` is a curried producer: zustand calls it with the
    // current state and stores the next immutable state.
    set(produce(recipe as (draft: PlannerStore) => void) as (s: PlannerStore) => PlannerStore);
    const after = get().scene;
    if (!timeTraveling && !paused && after !== before) {
      pushPast(before);
    }
  };

  const controls: HistoryControls = {
    undo: () => {
      const { history, scene } = get();
      if (history.past.length === 0) return;
      const previous = history.past[history.past.length - 1];
      timeTraveling = true;
      set({
        scene: previous,
        history: { past: history.past.slice(0, -1), future: [scene, ...history.future] },
      });
      timeTraveling = false;
    },
    redo: () => {
      const { history, scene } = get();
      if (history.future.length === 0) return;
      const next = history.future[0];
      timeTraveling = true;
      set({
        scene: next,
        history: { past: [...history.past, scene], future: history.future.slice(1) },
      });
      timeTraveling = false;
    },
    clearHistory: () => set({ history: { past: [], future: [] } }),
    pauseHistory: () => {
      paused = true;
      pausedSnapshot = get().scene;
    },
    resumeHistory: () => {
      paused = false;
      const before = pausedSnapshot;
      pausedSnapshot = null;
      if (before && before !== get().scene) pushPast(before);
    },
    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,
  };

  return { mutate, controls };
}
