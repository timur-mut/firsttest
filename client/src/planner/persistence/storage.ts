// Local persistence + file import/export. Owned by Unit 9 (Persistence).
// Foundation ships a WORKING minimal version; Unit 9 adds autosave/debounce,
// multiple named slots, error surfacing, etc. Signatures are the contract.

import type { Scene } from '../contract/types';
import { deserializeScene, serializeScene } from './serialize';

export const STORAGE_KEY = 'planner:scene';

/** Save the scene to localStorage. */
export function saveToLocal(scene: Scene): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeScene(scene));
  } catch {
    // ignore (storage disabled / quota)
  }
}

/** Load the scene from localStorage, or null if absent/invalid. */
export function loadFromLocal(): Scene | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? deserializeScene(raw) : null;
  } catch {
    return null;
  }
}

/** Trigger a download of the scene as a .json file. */
export function exportToFile(scene: Scene, filename = 'plan.json'): void {
  const blob = new Blob([serializeScene(scene)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read and parse a scene from a user-selected File. */
export async function importFromFile(file: File): Promise<Scene> {
  const text = await file.text();
  return deserializeScene(text);
}
