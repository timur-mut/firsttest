// Backend persistence — saved plans CRUD against the .NET API (/api/plans).
// The Vite dev server proxies /api to the API; in production the client talks to
// VITE_API_URL. The scene travels as the serialized envelope (see serialize.ts),
// stored server-side in a jsonb column.

import type { Scene } from '../contract/types';
import type { ReferenceImage } from '../store/referenceImageStore';
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

/** Full plan as returned by the API (scene + reference image are JSON strings). */
interface PlanResponse extends PlanSummary {
  scene: string;
  /** The reference-image underlay as a JSON string, or null. Sibling of scene. */
  referenceImage?: string | null;
}

/** A loaded plan: the validated scene plus its optional reference-image underlay. */
export interface LoadedPlan {
  scene: Scene;
  referenceImage: ReferenceImage | null;
}

function toSummary(p: PlanResponse): PlanSummary {
  return { id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt };
}

/** Parse the reference-image JSON string returned by the API; null on absence/error. */
function parseReferenceImage(raw: string | null | undefined): ReferenceImage | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as ReferenceImage;
    return obj && typeof obj.src === 'string' ? obj : null;
  } catch {
    return null;
  }
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

/** Load a plan by id: the validated scene plus its optional reference image. */
export async function loadPlanFromServer(id: number): Promise<LoadedPlan> {
  const res = await ok(await fetch(`${PLANS_URL}/${id}`), 'Load plan');
  const plan = (await res.json()) as PlanResponse;
  return {
    scene: deserializeScene(plan.scene),
    referenceImage: parseReferenceImage(plan.referenceImage),
  };
}

/** Create a new plan; returns its summary (including the new id). */
export async function savePlanToServer(
  name: string,
  scene: Scene,
  referenceImage: ReferenceImage | null = null,
): Promise<PlanSummary> {
  const res = await ok(
    await fetch(PLANS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        scene: serializeScene(scene),
        referenceImage: referenceImage ? JSON.stringify(referenceImage) : null,
      }),
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
  referenceImage: ReferenceImage | null = null,
): Promise<PlanSummary> {
  const res = await ok(
    await fetch(`${PLANS_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        scene: serializeScene(scene),
        referenceImage: referenceImage ? JSON.stringify(referenceImage) : null,
      }),
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
