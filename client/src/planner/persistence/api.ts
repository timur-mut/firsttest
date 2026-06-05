// Backend persistence — saved plans CRUD against the .NET API (/api/plans).
// The Vite dev server proxies /api to the API; in production the client talks to
// VITE_API_URL. The scene travels as the serialized envelope (see serialize.ts),
// stored server-side in a jsonb column.

import type { Scene } from '../contract/types';
import { deserializeScene, serializeScene } from './serialize';

// In dev, VITE_API_URL is empty and requests go to /api via the Vite proxy. In
// production it is the deployed API origin (the client and API are served from
// different CloudFront distributions), so a relative path would hit the static
// site instead of the API.
const PLANS_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/plans`;

/** Plan list item (no scene payload). */
export interface PlanSummary {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Full plan as returned by the API (scene is a JSON string). */
interface PlanResponse extends PlanSummary {
  scene: string;
}

function toSummary(p: PlanResponse): PlanSummary {
  return { id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt };
}

async function ok(res: Response, action: string): Promise<Response> {
  if (!res.ok) throw new Error(`${action} failed: ${res.status}`);
  return res;
}

/** List all saved plans, newest first. */
export async function listPlans(): Promise<PlanSummary[]> {
  const res = await ok(await fetch(PLANS_URL), 'Load plans');
  return (await res.json()) as PlanSummary[];
}

/** Load a plan's scene by id (validated via deserializeScene). */
export async function loadPlanFromServer(id: number): Promise<Scene> {
  const res = await ok(await fetch(`${PLANS_URL}/${id}`), 'Load plan');
  const plan = (await res.json()) as PlanResponse;
  return deserializeScene(plan.scene);
}

/** Create a new plan; returns its summary (including the new id). */
export async function savePlanToServer(name: string, scene: Scene): Promise<PlanSummary> {
  const res = await ok(
    await fetch(PLANS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scene: serializeScene(scene) }),
    }),
    'Save plan',
  );
  return toSummary((await res.json()) as PlanResponse);
}

/** Update an existing plan. */
export async function updatePlanOnServer(
  id: number,
  name: string,
  scene: Scene,
): Promise<PlanSummary> {
  const res = await ok(
    await fetch(`${PLANS_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scene: serializeScene(scene) }),
    }),
    'Update plan',
  );
  return toSummary((await res.json()) as PlanResponse);
}

/** Delete a plan (idempotent: a missing plan is treated as success). */
export async function deletePlanFromServer(id: number): Promise<void> {
  const res = await fetch(`${PLANS_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Delete plan failed: ${res.status}`);
}
