// Scene slice — base, foundation-IMPLEMENTED operations shared by all units.

import type { Mode, Scene, SnapMask } from '../../contract/types';
import type { SliceCreator } from '../storeTypes';
import { applyDerived, emptySelection, getSelectedLayer, makeEmptyScene } from '../helpers';
import { adoptIds } from '../../contract/ids';

/** Every entity id a scene carries — used to keep the id counter ahead of them. */
function* sceneIds(scene: Scene): Generator<string> {
  for (const layer of Object.values(scene.layers)) {
    yield layer.id;
    yield* Object.keys(layer.vertices);
    yield* Object.keys(layer.lines);
    yield* Object.keys(layer.holes);
    yield* Object.keys(layer.items);
    yield* Object.keys(layer.areas);
  }
}

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
      // Keep the id counter ahead of the loaded scene's ids so newly drawn
      // entities can never re-issue an existing id and overwrite it.
      adoptIds(sceneIds(scene));
      d.scene = scene;
      d.selected = emptySelection();
    }),

  resetScene: () =>
    mutate((d) => {
      const scene = makeEmptyScene();
      adoptIds(sceneIds(scene));
      d.scene = scene;
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
