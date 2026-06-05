// Local persistence + file import/export. Owned by Unit 9 (Persistence).
//
// Resilient by design: the localStorage helpers swallow failures (storage
// disabled, quota exceeded, malformed payload) so they never throw into the
// UI. The exported signatures are the FROZEN persistence contract.

import type { Scene } from '../contract/types';
import { deserializeScene, serializeScene } from './serialize';

export const STORAGE_KEY = 'planner:scene';

/** Save the scene to localStorage. Never throws. */
export function saveToLocal(scene: Scene): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeScene(scene));
  } catch {
    // ignore (storage disabled / quota exceeded / serialize failure)
  }
}

/** Load the scene from localStorage, or null if absent/invalid. Never throws. */
export function loadFromLocal(): Scene | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? deserializeScene(raw) : null;
  } catch {
    return null;
  }
}

/** Remove any persisted scene from localStorage. Never throws. */
export function clearLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore (storage disabled)
  }
}

/** Default debounce window (ms) for {@link autosave}. */
export const AUTOSAVE_DELAY_MS = 800;

let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Debounced localStorage save. Repeated calls within {@link AUTOSAVE_DELAY_MS}
 * collapse into a single write of the most recent scene. Never throws.
 */
export function autosave(scene: Scene, delay = AUTOSAVE_DELAY_MS): void {
  if (autosaveTimer !== undefined) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    autosaveTimer = undefined;
    saveToLocal(scene);
  }, delay);
}

/** Cancel any pending {@link autosave} write without flushing it. */
export function cancelAutosave(): void {
  if (autosaveTimer !== undefined) {
    clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
  }
}

/** Trigger a download of the scene as a .json file. */
export function exportToFile(scene: Scene, filename = 'plan.json'): void {
  const url = URL.createObjectURL(
    new Blob([serializeScene(scene)], { type: 'application/json' }),
  );
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Read and parse a scene from a user-selected File. Throws on invalid input. */
export async function importFromFile(file: File): Promise<Scene> {
  const text = await file.text();
  return deserializeScene(text);
}
