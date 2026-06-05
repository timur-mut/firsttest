// Wall slice — owned by Unit 2 (Wall drawing tool).
// The interface is FROZEN by the foundation; Unit 2 implements the bodies.

import type { Layer, Line, Point, Vertex } from '../../contract/types';
import { genId } from '../../contract/ids';
import { almostEqual } from '../../contract/geometry';
import type { SliceCreator } from '../storeTypes';
import { applyDerived, getSelectedLayer } from '../helpers';

/** Default wall dimensions, matching the sample-scene fixture conventions. */
const DEFAULT_THICKNESS = 20;
const DEFAULT_HEIGHT = 280;
/** Coincidence tolerance (world units) for merging onto an existing vertex. */
const MERGE_TOLERANCE = 1e-6;

/** In-progress wall chain while drawing. */
export interface WallDraft {
  /** Vertex ids already committed in the current chain. */
  vertices: string[];
  /** Live cursor preview point for the segment being drawn. */
  preview: Point | null;
}

export interface WallSlice {
  /** Transient draft state (null when not drawing). Not tracked by undo. */
  wallDraft: WallDraft | null;
  /** Start a new wall chain at a (snapped) world point. */
  beginWall(x: number, y: number): void;
  /** Commit the current preview point and continue the chain. */
  addWallPoint(x: number, y: number): void;
  /** Update the live preview point as the cursor moves. */
  updateWallDraft(x: number, y: number): void;
  /** Finish the chain, keeping drawn walls. */
  finishWall(): void;
  /** Abort the chain, discarding the in-progress draft. */
  cancelWall(): void;
  /** Move a vertex (and implicitly every wall attached to it). */
  moveVertex(vertexId: string, x: number, y: number): void;
  /**
   * Translate a whole wall by a world-space delta, moving BOTH of its
   * endpoints. Shared corners move too, so adjacent walls follow.
   */
  moveLine(lineId: string, dx: number, dy: number): void;
  /** Set a wall's thickness (clamped to a sensible minimum). */
  setLineThickness(lineId: string, thickness: number): void;
  /** Delete a wall (and orphaned vertices / holes). */
  removeLine(lineId: string): void;
}

/** Find an existing vertex at (x,y) within tolerance, if any. */
function findVertexAt(layer: Layer, x: number, y: number): Vertex | undefined {
  for (const v of Object.values(layer.vertices)) {
    if (almostEqual(v.x, x, MERGE_TOLERANCE) && almostEqual(v.y, y, MERGE_TOLERANCE)) {
      return v;
    }
  }
  return undefined;
}

/** Create a fresh vertex in the layer and return its id. */
function createVertex(layer: Layer, x: number, y: number): string {
  const id = genId('vertex');
  layer.vertices[id] = { id, x, y, lines: [] };
  return id;
}

/** Ensure a vertex exists at (x,y): reuse a coincident one or create a new one. */
function ensureVertex(layer: Layer, x: number, y: number): string {
  return findVertexAt(layer, x, y)?.id ?? createVertex(layer, x, y);
}

/**
 * Remove any vertices referenced by the current chain that ended up with no
 * attached lines (e.g. a start vertex the user never drew from). Called when a
 * chain ends so the scene never accumulates invisible degree-0 vertices.
 */
function pruneDraftOrphans(layer: Layer, vertexIds: string[]): void {
  for (const vId of vertexIds) {
    const v = layer.vertices[vId];
    if (v && v.lines.length === 0) delete layer.vertices[vId];
  }
}

/** Add a wall line between two existing vertices, wiring back-references. */
function createLine(layer: Layer, aId: string, bId: string): string {
  const id = genId('line');
  const line: Line = {
    id,
    type: 'wall',
    vertices: [aId, bId],
    thickness: DEFAULT_THICKNESS,
    height: DEFAULT_HEIGHT,
    holes: [],
  };
  layer.lines[id] = line;
  if (!layer.vertices[aId].lines.includes(id)) layer.vertices[aId].lines.push(id);
  if (!layer.vertices[bId].lines.includes(id)) layer.vertices[bId].lines.push(id);
  return id;
}

export const createWallSlice: SliceCreator<WallSlice> = (mutate) => ({
  wallDraft: null,

  beginWall: (x, y) =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      const startId = ensureVertex(layer, x, y);
      d.wallDraft = { vertices: [startId], preview: { x, y } };
    }),

  addWallPoint: (x, y) =>
    mutate((d) => {
      const draft = d.wallDraft;
      if (!draft || draft.vertices.length === 0) {
        // No chain in progress — behave like beginWall.
        const layer = getSelectedLayer(d.scene);
        const startId = ensureVertex(layer, x, y);
        d.wallDraft = { vertices: [startId], preview: { x, y } };
        return;
      }
      const layer = getSelectedLayer(d.scene);
      const prevId = draft.vertices[draft.vertices.length - 1];
      const nextId = ensureVertex(layer, x, y);
      // Ignore a zero-length segment (same point clicked twice).
      if (nextId === prevId) {
        draft.preview = { x, y };
        return;
      }
      createLine(layer, prevId, nextId);
      draft.vertices.push(nextId);
      draft.preview = { x, y };
      applyDerived(layer);
    }),

  updateWallDraft: (x, y) =>
    mutate((d) => {
      if (!d.wallDraft) return;
      d.wallDraft.preview = { x, y };
    }),

  finishWall: () =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      if (d.wallDraft) pruneDraftOrphans(layer, d.wallDraft.vertices);
      d.wallDraft = null;
      applyDerived(layer);
    }),

  cancelWall: () =>
    mutate((d) => {
      if (d.wallDraft) {
        pruneDraftOrphans(getSelectedLayer(d.scene), d.wallDraft.vertices);
      }
      d.wallDraft = null;
    }),

  moveVertex: (vertexId, x, y) =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      const vertex = layer.vertices[vertexId];
      if (!vertex) return;
      vertex.x = x;
      vertex.y = y;
      applyDerived(layer);
    }),

  moveLine: (lineId, dx, dy) =>
    mutate((d) => {
      if (dx === 0 && dy === 0) return;
      const layer = getSelectedLayer(d.scene);
      const line = layer.lines[lineId];
      if (!line) return;
      // Translate each distinct endpoint. A wall's two endpoints are always
      // distinct, but guard against duplicates defensively.
      const seen = new Set<string>();
      for (const vId of line.vertices) {
        if (seen.has(vId)) continue;
        seen.add(vId);
        const v = layer.vertices[vId];
        if (!v) continue;
        v.x += dx;
        v.y += dy;
      }
      applyDerived(layer);
    }),

  setLineThickness: (lineId, thickness) =>
    mutate((d) => {
      const line = getSelectedLayer(d.scene).lines[lineId];
      if (!line) return;
      line.thickness = Math.max(1, thickness);
    }),

  removeLine: (lineId) =>
    mutate((d) => {
      const layer = getSelectedLayer(d.scene);
      const line = layer.lines[lineId];
      if (!line) return;

      // Drop the holes carried by this wall.
      for (const holeId of line.holes) {
        delete layer.holes[holeId];
      }

      // Detach from each endpoint and delete now-orphaned vertices.
      for (const vId of line.vertices) {
        const vertex = layer.vertices[vId];
        if (!vertex) continue;
        vertex.lines = vertex.lines.filter((id) => id !== lineId);
        if (vertex.lines.length === 0) delete layer.vertices[vId];
      }

      delete layer.lines[lineId];
      applyDerived(layer);
    }),
});
