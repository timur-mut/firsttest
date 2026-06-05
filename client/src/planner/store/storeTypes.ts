// ─────────────────────────────────────────────────────────────────────────────
// Store type composition. Foundation-owned, frozen.
//
// `PlannerStore` is the intersection of the core state, the history controls,
// and every feature slice. Slice interfaces live in their own files (and are
// implemented by the owning unit); only their TYPE is imported here.
// ─────────────────────────────────────────────────────────────────────────────

import type { History, Mode, Point, Scene, Selection, SnapMask } from '../contract/types';
import type { HistoryControls } from './history';
import type { SceneSlice } from './slices/sceneSlice';
import type { WallSlice } from './slices/wallSlice';
import type { HoleSlice } from './slices/holeSlice';
import type { AreaSlice } from './slices/areaSlice';
import type { FurnitureSlice } from './slices/furnitureSlice';
import type { SelectionSlice } from './slices/selectionSlice';
import type { ViewportSlice } from './slices/viewportSlice';

/** Foundation-owned core state (slices add only actions + transient fields). */
export interface PlannerCoreState {
  scene: Scene;
  mode: Mode;
  selected: Selection;
  /** Zoom factor (multiplies meta.pixelsPerUnit). */
  zoom: number;
  /** Pan offset in screen pixels. */
  pan: Point;
  snapMask: SnapMask;
  history: History;
}

/** The complete store: core + history + all feature slices. */
export type PlannerStore = PlannerCoreState &
  HistoryControls &
  SceneSlice &
  WallSlice &
  HoleSlice &
  AreaSlice &
  FurnitureSlice &
  SelectionSlice &
  ViewportSlice;

/** Immer-style draft mutator handed to every slice (auto-tracks undo history). */
export type Mutate = (recipe: (draft: PlannerStore) => void) => void;

/** Read the current store state. */
export type Get = () => PlannerStore;

/** Signature every slice creator follows. */
export type SliceCreator<T> = (mutate: Mutate, get: Get) => T;
