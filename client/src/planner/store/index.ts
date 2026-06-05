// ─────────────────────────────────────────────────────────────────────────────
// Store root — FROZEN aggregator. Foundation-owned.
//
// Composes core state + history controls + every feature slice into one Zustand
// store. Workers implement their slice file; they NEVER edit this file. Adding a
// slice here is a foundation-only change.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import { createHistory } from './history';
import { emptySelection } from './helpers';
import type { PlannerStore } from './storeTypes';
import { createSceneSlice } from './slices/sceneSlice';
import { createWallSlice } from './slices/wallSlice';
import { createHoleSlice } from './slices/holeSlice';
import { createAreaSlice } from './slices/areaSlice';
import { createFurnitureSlice } from './slices/furnitureSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createViewportSlice } from './slices/viewportSlice';

export const usePlannerStore = create<PlannerStore>((set, get) => {
  const { mutate, controls } = createHistory(set, get);

  return {
    // ── core state ──────────────────────────────────────────────────────────
    scene: makeSampleScene(),
    mode: 'idle',
    selected: emptySelection(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    snapMask: { grid: true, vertex: true, line: true, guide: true },
    history: { past: [], future: [] },

    // ── undo/redo controls ────────────────────────────────────────────────────
    ...controls,

    // ── feature slices ────────────────────────────────────────────────────────
    ...createSceneSlice(mutate, get),
    ...createWallSlice(mutate, get),
    ...createHoleSlice(mutate, get),
    ...createAreaSlice(mutate, get),
    ...createFurnitureSlice(mutate, get),
    ...createSelectionSlice(mutate, get),
    ...createViewportSlice(mutate, get),
  };
});

export type { PlannerStore } from './storeTypes';
