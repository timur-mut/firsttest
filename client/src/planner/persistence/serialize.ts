// Scene (de)serialization. Owned by Unit 9 (Persistence).
// Foundation ships a WORKING minimal version; Unit 9 hardens it (schema
// version migrations, validation, stripping derived `areas`, etc.) WITHOUT
// changing these signatures (they are the persistence contract).

import type { Scene } from '../contract/types';

/** Bump when the on-disk shape changes; Unit 9 adds migrations. */
export const SCENE_FORMAT_VERSION = 1;

interface SerializedScene {
  version: number;
  scene: Scene;
}

/** Serialize a scene to a JSON string. */
export function serializeScene(scene: Scene): string {
  const payload: SerializedScene = { version: SCENE_FORMAT_VERSION, scene };
  return JSON.stringify(payload);
}

/** Parse a scene from a JSON string. Throws on malformed input. */
export function deserializeScene(json: string): Scene {
  const parsed = JSON.parse(json) as Partial<SerializedScene> & { scene?: Scene };
  if (!parsed || typeof parsed !== 'object' || !parsed.scene) {
    throw new Error('Invalid plan file: missing scene');
  }
  // Unit 9: migrate by parsed.version here.
  return parsed.scene;
}
