// Scene (de)serialization. Owned by Unit 9 (Persistence).
//
// This is the hardened version: it validates the parsed shape, exposes a
// version-based migration seam, and strips derived `areas` on serialize (rooms
// are recomputed by area detection, so persisting them only bloats the file).
// The exported signatures are the FROZEN persistence contract — TopBar and the
// storage/api modules import them, so they must not change.

import type { Layer, Scene } from '../contract/types';

/** Bump when the on-disk shape changes; add a migration step below. */
export const SCENE_FORMAT_VERSION = 1;

interface SerializedScene {
  version: number;
  scene: Scene;
}

/**
 * Serialize a scene to a JSON string.
 *
 * The derived geometry of each room (its `vertices`/`area`) is stripped from
 * every layer: rooms are recomputed from walls by area detection, so persisting
 * their geometry only bloats the file and risks going stale. The user OVERRIDES
 * (name, color, flooring) are kept — keyed by the room's deterministic id, area
 * detection re-attaches them on load.
 */
export function serializeScene(scene: Scene): string {
  const payload: SerializedScene = {
    version: SCENE_FORMAT_VERSION,
    scene: stripAreas(scene),
  };
  return JSON.stringify(payload);
}

/** Parse a scene from a JSON string. Throws a clear error on malformed input. */
export function deserializeScene(json: string): Scene {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid plan file: not valid JSON');
  }
  if (!isRecord(parsed) || !('scene' in parsed)) {
    throw new Error('Invalid plan file: missing scene');
  }
  const version = typeof parsed.version === 'number' ? parsed.version : 0;
  const migrated = migrate(parsed.scene, version);
  return validateScene(migrated);
}

/**
 * Migration seam. Given a raw `scene` and the version it was written with,
 * return a scene in the CURRENT shape. v1 (and the unversioned legacy shape)
 * are identity today; add `case N:` steps here as the format evolves, each one
 * upgrading from version N to N+1 and falling through to the next.
 */
export function migrate(scene: unknown, version: number): unknown {
  // Normalize the unversioned legacy shape (version 0) to v1; both are the same
  // structure today, so no transform is needed. Add steps as the format grows:
  //   let v = version < 1 ? 1 : version;
  //   if (v === 1) { scene = v1ToV2(scene); v = 2; }
  void version;
  return scene;
}

// ── Validation ──────────────────────────────────────────────────────────────

/** Throw if `value` is not a structurally valid Scene; otherwise return it. */
function validateScene(value: unknown): Scene {
  if (!isRecord(value)) {
    throw new Error('Invalid plan file: scene is not an object');
  }
  if (typeof value.name !== 'string') {
    throw new Error('Invalid plan file: scene.name is missing');
  }
  if (typeof value.width !== 'number' || typeof value.height !== 'number') {
    throw new Error('Invalid plan file: scene dimensions are missing');
  }
  if (!isRecord(value.layers)) {
    throw new Error('Invalid plan file: scene.layers is missing');
  }
  if (typeof value.selectedLayer !== 'string') {
    throw new Error('Invalid plan file: scene.selectedLayer is missing');
  }
  if (!isRecord(value.meta) || typeof value.meta.pixelsPerUnit !== 'number') {
    throw new Error('Invalid plan file: scene.meta is missing');
  }
  if (!(value.selectedLayer in value.layers)) {
    throw new Error('Invalid plan file: selectedLayer references an unknown layer');
  }

  const layers: Record<string, Layer> = {};
  for (const [layerId, rawLayer] of Object.entries(value.layers)) {
    layers[layerId] = validateLayer(rawLayer, layerId);
  }

  return {
    name: value.name,
    width: value.width,
    height: value.height,
    selectedLayer: value.selectedLayer,
    meta: value.meta as unknown as Scene['meta'],
    layers,
  };
}

/** Validate a single layer, ensuring the normalized record maps all exist. */
function validateLayer(value: unknown, layerId: string): Layer {
  if (!isRecord(value)) {
    throw new Error(`Invalid plan file: layer "${layerId}" is not an object`);
  }
  for (const key of ['vertices', 'lines', 'holes', 'items'] as const) {
    if (!isRecord(value[key])) {
      throw new Error(`Invalid plan file: layer "${layerId}" is missing ${key}`);
    }
  }
  return {
    id: typeof value.id === 'string' ? value.id : layerId,
    name: typeof value.name === 'string' ? value.name : layerId,
    vertices: value.vertices as Layer['vertices'],
    lines: value.lines as Layer['lines'],
    holes: value.holes as Layer['holes'],
    items: value.items as Layer['items'],
    // `areas` are derived; accept whatever is present but default to empty.
    areas: isRecord(value.areas) ? (value.areas as Layer['areas']) : {},
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Return a copy of the scene where every room keeps only its user overrides
 * (name/color/flooring), with the derived `vertices`/`area` dropped. The room's
 * id (the map key) encodes its corner set, so detection re-matches the override
 * to the recomputed room on load.
 */
function stripAreas(scene: Scene): Scene {
  const layers: Record<string, Layer> = {};
  for (const [id, layer] of Object.entries(scene.layers)) {
    const areas: Layer['areas'] = {};
    for (const [areaId, area] of Object.entries(layer.areas)) {
      areas[areaId] = {
        id: area.id,
        vertices: [],
        area: 0,
        color: area.color,
        ...(area.name !== undefined ? { name: area.name } : {}),
        ...(area.flooring !== undefined ? { flooring: area.flooring } : {}),
      };
    }
    layers[id] = { ...layer, areas };
  }
  return { ...scene, layers };
}
