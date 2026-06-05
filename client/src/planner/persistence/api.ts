// Optional backend sync. STUB owned by Unit 9 (Persistence).
//
// Unit 9 may implement these against a new .NET endpoint (POST/GET /api/plans)
// in src/FirstTest.Api, mirroring the existing todos endpoint style. The Vite
// dev server already proxies /api to the backend. Keeping it optional: the app
// works fully with localStorage + file import/export alone.

import type { Scene } from '../contract/types';
import { serializeScene } from './serialize';

/** Persist a plan to the backend. Returns the saved plan id. */
export async function savePlanToServer(scene: Scene): Promise<string> {
  const res = await fetch('/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serializeScene(scene),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Load a plan from the backend by id. */
export async function loadPlanFromServer(id: string): Promise<Scene> {
  const res = await fetch(`/api/plans/${id}`);
  if (!res.ok) throw new Error(`Load failed: ${res.status}`);
  return (await res.json()) as Scene;
}
