// ─────────────────────────────────────────────────────────────────────────────
// Pure geometry helpers. FULLY IMPLEMENTED and foundation-owned so that Units
// 2/3/4/6/7/8 all share one correct implementation instead of each rolling
// their own. No React, no store — pure functions only.
//
// Several routines are ports of cvdlab/react-planner's `src/utils/geometry.js`
// (MIT-licensed), adapted to TypeScript.
// ─────────────────────────────────────────────────────────────────────────────

import type { Point, Vertex } from './types';

const EPSILON = 1e-6;

/** Euclidean distance between two coordinate pairs. */
export function distance(x0: number, y0: number, x1: number, y1: number): number {
  return Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
}

/** Euclidean distance between two points. */
export function pointsDistance(a: Point, b: Point): number {
  return distance(a.x, a.y, b.x, b.y);
}

/** Distance between two vertices. */
export function verticesDistance(a: Vertex, b: Vertex): number {
  return distance(a.x, a.y, b.x, b.y);
}

/** Midpoint of two points. */
export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Linear interpolation between two points; t in [0, 1]. */
export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Point at fractional position `t` along segment a->b. Alias of `lerp` with a
 * domain-specific name used by hole positioning (Unit 3).
 */
export function pointOnLine(a: Point, b: Point, t: number): Point {
  return lerp(a, b, t);
}

/** Angle of segment a->b in radians, measured from +x axis. */
export function angleRadians(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** Angle of segment a->b in degrees in [0, 360). */
export function angleDegrees(a: Point, b: Point): number {
  const deg = (angleRadians(a, b) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Normalize an angle (degrees) into [0, 360). */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Snap an angle (degrees) to the nearest multiple of `step`. */
export function snapAngle(deg: number, step: number): number {
  if (step <= 0) return deg;
  return normalizeAngle(Math.round(deg / step) * step);
}

/**
 * Project point p onto segment a->b. Returns the closest point on the segment,
 * the clamped parameter `t` in [0, 1], and the perpendicular `distance`.
 */
export function projectPointOnSegment(
  p: Point,
  a: Point,
  b: Point,
): { point: Point; t: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq < EPSILON ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + dx * t, y: a.y + dy * t };
  return { point, t, distance: pointsDistance(p, point) };
}

/**
 * Build the 4 corner points of a wall rectangle for segment a->b expanded by
 * `thickness` (centered on the line). Returned clockwise.
 */
export function linePolygon(a: Point, b: Point, thickness: number): Point[] {
  const ang = angleRadians(a, b);
  const half = thickness / 2;
  const nx = Math.cos(ang + Math.PI / 2) * half;
  const ny = Math.sin(ang + Math.PI / 2) * half;
  return [
    { x: a.x + nx, y: a.y + ny },
    { x: b.x + nx, y: b.y + ny },
    { x: b.x - nx, y: b.y - ny },
    { x: a.x - nx, y: a.y - ny },
  ];
}

/** Signed area of a polygon via the shoelace formula (CCW positive). */
export function shoelaceSignedArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/** Absolute polygon area. */
export function polygonArea(points: Point[]): number {
  return Math.abs(shoelaceSignedArea(points));
}

/** Centroid of a polygon (vertex average — adequate for labels). */
export function polygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** Ray-casting point-in-polygon test. */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True when two values are equal within EPSILON. */
export function almostEqual(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps;
}

/** Total edge length around a (closed) polygon. */
export function polygonPerimeter(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    sum += pointsDistance(points[i], points[(i + 1) % points.length]);
  }
  return sum;
}

/**
 * Intersection of two infinite lines, each given as a point + direction vector.
 * Returns null when the lines are parallel (within EPSILON).
 */
export function lineIntersection(p1: Point, d1: Point, p2: Point, d2: Point): Point | null {
  const denom = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(denom) < EPSILON) return null;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

/** Offset each polygon edge sideways and re-intersect adjacent edges (miter). */
function offsetCorners(outer: Point[], dist: number[], sign: number): Point[] {
  const n = outer.length;
  const lines = outer.map((p, i) => {
    const q = outer[(i + 1) % n];
    let ux = q.x - p.x;
    let uy = q.y - p.y;
    const len = Math.hypot(ux, uy) || 1;
    ux /= len;
    uy /= len;
    // Perpendicular, flipped by `sign` to choose the offset side.
    const nx = -uy * sign;
    const ny = ux * sign;
    const o = dist[i];
    return { p: { x: p.x + nx * o, y: p.y + ny * o }, d: { x: ux, y: uy } };
  });
  const inner: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = lines[(i - 1 + n) % n];
    const cur = lines[i];
    // Corner = where the two offset edges meet (mitered); straight runs fall
    // back to the offset start point.
    inner.push(lineIntersection(prev.p, prev.d, cur.p, cur.d) ?? cur.p);
  }
  return inner;
}

/**
 * Inset a simple polygon inward, offsetting each edge by its own distance and
 * mitering the corners. `dist[i]` is the inward offset of edge i (outer[i] ->
 * outer[i+1]). The inward side is chosen automatically (the offset that shrinks
 * the polygon). Edge count is preserved (one inner point per outer point).
 */
export function insetPolygon(outer: Point[], dist: number[]): Point[] {
  if (outer.length < 3) return outer.map((p) => ({ ...p }));
  const a = offsetCorners(outer, dist, 1);
  const b = offsetCorners(outer, dist, -1);
  // The inward offset is the one that yields the smaller area.
  return polygonArea(a) <= polygonArea(b) ? a : b;
}
