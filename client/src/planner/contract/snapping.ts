// ─────────────────────────────────────────────────────────────────────────────
// Snapping math. FULLY IMPLEMENTED and foundation-owned. Consumed by the wall
// tool (Unit 2) and furniture placement (Unit 6) so both snap identically.
//
// Priority order: vertex > line > grid (matches react-planner's snap.js).
// ─────────────────────────────────────────────────────────────────────────────

import type { Line, Point, SnapMask, Vertex } from './types';
import { projectPointOnSegment } from './geometry';

export type SnapKind = 'vertex' | 'line' | 'grid';

export interface SnapResult {
  /** Snapped coordinate (falls back to the raw point when nothing snaps). */
  x: number;
  y: number;
  /** What was snapped to, if anything. */
  snap?: {
    kind: SnapKind;
    /** For 'vertex': the vertex id. For 'line': the line id. */
    targetId?: string;
  };
}

export interface SnapContext {
  vertices: Record<string, Vertex>;
  lines: Record<string, Line>;
  /** Grid spacing in world units. */
  gridSize: number;
  /** Snap radius in world units (typically derived from zoom). */
  radius: number;
  mask: SnapMask;
}

/** Snap a value to the nearest multiple of `step`. */
export function snapToGrid(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

function nearestVertex(
  p: Point,
  vertices: Record<string, Vertex>,
  radius: number,
): { id: string; x: number; y: number; dist: number } | null {
  let best: { id: string; x: number; y: number; dist: number } | null = null;
  for (const v of Object.values(vertices)) {
    const dist = Math.hypot(v.x - p.x, v.y - p.y);
    if (dist <= radius && (best === null || dist < best.dist)) {
      best = { id: v.id, x: v.x, y: v.y, dist };
    }
  }
  return best;
}

function nearestLine(
  p: Point,
  lines: Record<string, Line>,
  vertices: Record<string, Vertex>,
  radius: number,
): { id: string; x: number; y: number; dist: number } | null {
  let best: { id: string; x: number; y: number; dist: number } | null = null;
  for (const line of Object.values(lines)) {
    const a = vertices[line.vertices[0]];
    const b = vertices[line.vertices[1]];
    if (!a || !b) continue;
    const { point, distance } = projectPointOnSegment(p, a, b);
    if (distance <= radius && (best === null || distance < best.dist)) {
      best = { id: line.id, x: point.x, y: point.y, dist: distance };
    }
  }
  return best;
}

/**
 * Snap a world point against vertices, lines and the grid, honoring the mask
 * and priority order. Always returns coordinates; `snap` is set only when a
 * target was hit.
 */
export function snapPoint(p: Point, ctx: SnapContext): SnapResult {
  if (ctx.mask.vertex) {
    const v = nearestVertex(p, ctx.vertices, ctx.radius);
    if (v) return { x: v.x, y: v.y, snap: { kind: 'vertex', targetId: v.id } };
  }
  if (ctx.mask.line) {
    const l = nearestLine(p, ctx.lines, ctx.vertices, ctx.radius);
    if (l) return { x: l.x, y: l.y, snap: { kind: 'line', targetId: l.id } };
  }
  if (ctx.mask.grid) {
    return {
      x: snapToGrid(p.x, ctx.gridSize),
      y: snapToGrid(p.y, ctx.gridSize),
      snap: { kind: 'grid' },
    };
  }
  return { x: p.x, y: p.y };
}
