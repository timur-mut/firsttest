// Optional backend sync. Owned by Unit 9 (Persistence).
//
// These call the backend plans endpoint (POST/GET /api/plans); the Vite dev
// server proxies /api to the .NET API. The backend endpoint is OPTIONAL — the
// app works fully with localStorage + file import/export — so this unit ships
// the client side only and leaves these resilient against a missing endpoint.
// The exported signatures are the FROZEN persistence contract.

import type { Scene } from '../contract/types';
import { deserializeScene, serializeScene } from './serialize';

const PLANS_URL = '/api/plans';

/** Persist a plan to the backend. Returns the saved plan id. Throws on failure. */
export async function savePlanToServer(scene: Scene): Promise<string> {
  const res = await fetch(PLANS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serializeScene(scene),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);

  const data = (await res.json()) as { id?: unknown };
  if (data == null || (typeof data.id !== 'string' && typeof data.id !== 'number')) {
    throw new Error('Save failed: server did not return a plan id');
  }
  return String(data.id);
}

/** Load a plan from the backend by id. Throws on failure or invalid payload. */
export async function loadPlanFromServer(id: string): Promise<Scene> {
  const res = await fetch(`${PLANS_URL}/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Load failed: ${res.status}`);

  // The endpoint may return either the raw serialized envelope (a JSON string)
  // or the scene object directly; deserializeScene validates the former, so
  // re-serialize a plain object through it to get a single validated path.
  const body = (await res.json()) as unknown;
  const json = typeof body === 'string' ? body : JSON.stringify(envelope(body));
  return deserializeScene(json);
}

/** Wrap a bare scene object in the serialized envelope deserializeScene expects. */
function envelope(scene: unknown): { version: number; scene: unknown } {
  if (scene != null && typeof scene === 'object' && 'scene' in scene) {
    return scene as { version: number; scene: unknown };
  }
  return { version: 1, scene };
}
