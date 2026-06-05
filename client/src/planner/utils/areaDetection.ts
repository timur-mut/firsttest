// ─────────────────────────────────────────────────────────────────────────────
// Unit 4 — Room / area detection.
//
// Ported from cvdlab/react-planner's inner-cycle (planar minimal-face) graph
// algorithm (`src/utils/graph-inner-cycles.js`, MIT-licensed), reimplemented in
// TypeScript against the normalized Layer model.
//
// Algorithm overview:
//   1. Build vertex adjacency from walls (vertex.lines / line.vertices).
//   2. Iteratively strip degree-1 vertices/edges — only vertices with degree ≥ 2
//      can take part in a cycle (a "tree" branch never bounds a room).
//   3. For every directed half-edge, walk a minimal face: at each vertex pick the
//      next outgoing edge that turns "hardest right" (the next neighbour
//      clockwise from the reversed incoming direction). This traces exactly one
//      minimal face per starting half-edge.
//   4. Compute each face's signed area (shoelace). Discard the unbounded outer
//      face (positive/CCW orientation in screen coordinates where +y points down)
//      and degenerate faces. Dedupe faces equal up to rotation/reflection.
//   5. Emit one Area per real room, preserving an existing color override when
//      the same cycle (matched by sorted vertex-id set) re-appears.
// ─────────────────────────────────────────────────────────────────────────────

import type { Area, Layer, Point } from '../contract/types';
import { polygonArea, shoelaceSignedArea } from '../contract/geometry';
import { genId } from '../contract/ids';

/** Default room fill color (used when no override exists for the cycle). */
export const DEFAULT_AREA_COLOR = '#f5f4f1';

type Adjacency = Map<string, Set<string>>;

/** Build the undirected adjacency graph of vertices connected by walls. */
function buildAdjacency(layer: Layer): Adjacency {
  const adj: Adjacency = new Map();
  const ensure = (id: string): Set<string> => {
    let set = adj.get(id);
    if (!set) {
      set = new Set();
      adj.set(id, set);
    }
    return set;
  };

  for (const line of Object.values(layer.lines)) {
    const [a, b] = line.vertices;
    if (a === b) continue; // ignore self-loops / degenerate lines
    if (!layer.vertices[a] || !layer.vertices[b]) continue;
    ensure(a).add(b);
    ensure(b).add(a);
  }
  return adj;
}

/** Iteratively remove degree-1 vertices (and their edges): tree branches. */
function stripDanglingVertices(adj: Adjacency): void {
  const queue: string[] = [];
  for (const [id, nbrs] of adj) {
    if (nbrs.size <= 1) queue.push(id);
  }

  while (queue.length > 0) {
    const id = queue.pop()!;
    const nbrs = adj.get(id);
    if (!nbrs || nbrs.size > 1) continue;
    for (const other of nbrs) {
      const otherNbrs = adj.get(other);
      if (otherNbrs) {
        otherNbrs.delete(id);
        if (otherNbrs.size <= 1) queue.push(other);
      }
    }
    adj.delete(id);
  }
}

/** Angle of the directed edge from -> to, in radians (atan2). */
function edgeAngle(layer: Layer, from: string, to: string): number {
  const a = layer.vertices[from];
  const b = layer.vertices[to];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Given the directed edge (prev -> curr), pick the next vertex so the turn is
 * "hardest right" — i.e. the neighbour whose outgoing direction is the next one
 * clockwise from the reversed incoming direction. This is react-planner's
 * `getNextEdge` rule and traces a single minimal face.
 */
function nextVertex(
  layer: Layer,
  adj: Adjacency,
  prev: string,
  curr: string,
): string | null {
  const neighbors = adj.get(curr);
  if (!neighbors || neighbors.size === 0) return null;

  // Direction we arrived from, pointing back out along the incoming edge.
  const incomingBack = edgeAngle(layer, curr, prev);

  let best: string | null = null;
  let bestDelta = Infinity;

  for (const candidate of neighbors) {
    // Allow returning along the same edge only when it's the lone option
    // (handled by the smallest-clockwise-delta selection below).
    const out = edgeAngle(layer, curr, candidate);
    // Clockwise angular distance from incomingBack to the candidate direction.
    // In screen coords (+y down) the smallest positive clockwise delta is the
    // hardest-right turn. We measure clockwise = decreasing atan2 angle.
    let delta = incomingBack - out;
    // Normalize into (0, 2π]; reversing the edge (delta == 0) maps to 2π so it
    // is only ever chosen as a last resort (dead-end U-turn).
    delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (delta <= 1e-9) delta = 2 * Math.PI;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  }
  return best;
}

/** Trace the minimal face starting from the directed half-edge start -> second. */
function traceFace(
  layer: Layer,
  adj: Adjacency,
  start: string,
  second: string,
): string[] | null {
  const cycle: string[] = [start];
  let prev = start;
  let curr = second;
  const maxSteps = adj.size * 4 + 8; // safety bound against malformed graphs

  for (let i = 0; i < maxSteps; i++) {
    cycle.push(curr);
    const next = nextVertex(layer, adj, prev, curr);
    if (next === null) return null;
    if (curr === start && next === second) {
      cycle.pop(); // remove the duplicated start vertex
      return cycle;
    }
    prev = curr;
    curr = next;
  }
  return null;
}

/** Canonical key for a directed half-edge. */
function edgeKey(a: string, b: string): string {
  return `${a}->${b}`;
}

/** Canonical key for a cycle, invariant under rotation and reflection. */
function cycleKey(cycle: string[]): string {
  const sorted = [...cycle].sort();
  return sorted.join('|');
}

/** World points of a vertex cycle. */
function cyclePoints(layer: Layer, cycle: string[]): Point[] {
  return cycle.map((id) => {
    const v = layer.vertices[id];
    return { x: v.x, y: v.y };
  });
}

/**
 * Detect rooms (minimal interior faces) in a layer.
 *
 * Returns a map keyed by generated Area id. Each Area carries the ordered vertex
 * cycle, its absolute area in world units², and a fill color (preserving any
 * existing override for the same cycle).
 */
export function detectAreas(layer: Layer): Record<string, Area> {
  const adj = buildAdjacency(layer);
  stripDanglingVertices(adj);

  // Map existing areas by their cycle key so we can preserve color overrides.
  const existingByKey = new Map<string, Area>();
  for (const area of Object.values(layer.areas)) {
    existingByKey.set(cycleKey(area.vertices), area);
  }

  const visitedHalfEdges = new Set<string>();
  const facesByKey = new Map<string, string[]>();

  for (const [from, neighbors] of adj) {
    for (const to of neighbors) {
      const key = edgeKey(from, to);
      if (visitedHalfEdges.has(key)) continue;

      const face = traceFace(layer, adj, from, to);
      if (!face) {
        visitedHalfEdges.add(key);
        continue;
      }

      // Mark every directed half-edge consumed by this face as visited so each
      // face is produced exactly once.
      for (let i = 0; i < face.length; i++) {
        const a = face[i];
        const b = face[(i + 1) % face.length];
        visitedHalfEdges.add(edgeKey(a, b));
      }

      if (face.length < 3) continue;

      const signed = shoelaceSignedArea(cyclePoints(layer, face));
      // The hardest-right traversal traces interior minimal faces with POSITIVE
      // signed area and the single unbounded outer face with negative signed
      // area. Keep only positively-oriented, non-degenerate faces (this drops
      // the outer face and any collinear/degenerate cycles).
      if (signed <= 1e-6) continue;

      const ck = cycleKey(face);
      if (!facesByKey.has(ck)) facesByKey.set(ck, face);
    }
  }

  const result: Record<string, Area> = {};
  for (const [ck, face] of facesByKey) {
    const existing = existingByKey.get(ck);
    const id = existing ? existing.id : genId('area');
    result[id] = {
      id,
      vertices: face,
      area: polygonArea(cyclePoints(layer, face)),
      color: existing ? existing.color : DEFAULT_AREA_COLOR,
    };
  }
  return result;
}
