// Wall slice — STUB owned by Unit 2 (Wall drawing tool).
// The interface is FROZEN by the foundation; Unit 2 implements the bodies.

import type { Point } from '../../contract/types';
import type { SliceCreator } from '../storeTypes';

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
  /** Delete a wall (and orphaned vertices / holes). */
  removeLine(lineId: string): void;
}

export const createWallSlice: SliceCreator<WallSlice> = () => ({
  wallDraft: null,
  beginWall: (_x, _y) => {},
  addWallPoint: (_x, _y) => {},
  updateWallDraft: (_x, _y) => {},
  finishWall: () => {},
  cancelWall: () => {},
  moveVertex: (_vertexId, _x, _y) => {},
  removeLine: (_lineId) => {},
});
