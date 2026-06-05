// ─────────────────────────────────────────────────────────────────────────────
// STUB — owned by Unit 4 (Room/area detection).
//
// Replace this with a port of react-planner's inner-cycle (planar minimal-face)
// algorithm: build vertex adjacency from walls, strip degree-1 chains, walk
// faces by always taking the hardest-right turn, compute the shoelace area, and
// discard the outer face. Return one `Area` per detected room, keyed by id.
//
// Until then it returns no rooms so the foundation compiles and renders.
// ─────────────────────────────────────────────────────────────────────────────

import type { Area, Layer } from '../contract/types';

export function detectAreas(_layer: Layer): Record<string, Area> {
  return {};
}
