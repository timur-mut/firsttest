// Scene slice — base, foundation-IMPLEMENTED operations shared by all units.

import type { Mode, Scene, SnapMask } from '../../contract/types';
import type { SliceCreator } from '../storeTypes';
import { applyDerived, emptySelection, getSelectedLayer, makeEmptyScene } from '../helpers';

export interface SceneSlice {
  /** Switch interaction mode (toolbar / tools). */
  setMode(mode: Mode): void;
  /** Replace the whole scene (load / import). */
  setScene(scene: Scene): void;
  /** Reset to a blank project. */
  resetScene(): void;
  /** Rename the project. */
  renameProject(name: string): void;
  /** Choose the active layer. */
  selectLayer(layerId: string): void;
  /** Toggle one snap source on/off (not tracked by undo). */
  toggleSnap(kind: keyof SnapMask): void;
  /** Recompute rooms for the active layer (single undo step). */
  recomputeAreas(): void;
}

export const createSceneSlice: SliceCreator<SceneSlice> = (mutate) => ({
  setMode: (mode) =>
    mutate((d) => {
      d.mode = mode;
    }),

  setScene: (scene) =>
    mutate((d) => {
      d.scene = scene;
      d.selected = emptySelection();
    }),

  resetScene: () =>
    mutate((d) => {
      d.scene = makeEmptyScene();
      d.selected = emptySelection();
      d.mode = 'idle';
    }),

  renameProject: (name) =>
    mutate((d) => {
      d.scene.name = name;
    }),

  selectLayer: (layerId) =>
    mutate((d) => {
      if (d.scene.layers[layerId]) d.scene.selectedLayer = layerId;
    }),

  toggleSnap: (kind) =>
    mutate((d) => {
      d.snapMask[kind] = !d.snapMask[kind];
    }),

  recomputeAreas: () =>
    mutate((d) => {
      applyDerived(getSelectedLayer(d.scene));
    }),
});
