// ─────────────────────────────────────────────────────────────────────────────
// FROZEN CONTRACT — the planner scene model and store-state shape.
//
// This file is owned by the foundation. Feature workers READ it but must NOT
// edit it. Changing a type here forces a global rebase of every parallel unit.
//
// Architecture is inspired by cvdlab/react-planner (MIT) but reimplemented in
// TypeScript with normalized (Record<id, T>) collections.
// ─────────────────────────────────────────────────────────────────────────────

/** A point in world (model) coordinates. Units are `Scene.meta.unit`. */
export interface Vertex {
  id: string;
  x: number;
  y: number;
  /** Back-references to every line touching this vertex (adjacency). */
  lines: string[];
}

/** A wall segment between two vertices. */
export interface Line {
  id: string;
  type: 'wall';
  /** Exactly two vertex ids: [start, end]. */
  vertices: [string, string];
  /** Wall thickness in world units. */
  thickness: number;
  /** Wall height in world units (used by future 3D; kept for forward-compat). */
  height: number;
  /** Ids of holes carried by this line, ordered along the line. */
  holes: string[];
}

export type HoleType = 'door' | 'window';

/** A door or window cut into a line. */
export interface Hole {
  id: string;
  type: HoleType;
  /** The line this hole belongs to. */
  lineId: string;
  /**
   * Fractional position of the hole CENTER along the line, from
   * vertices[0] -> vertices[1]. Range [0, 1]. Storing a fraction (not an
   * absolute distance) keeps the hole valid when a wall endpoint moves.
   */
  offset: number;
  /** Hole width in world units. */
  width: number;
  /** Hole height in world units. */
  height: number;
  /** Distance of the hole bottom from the floor, in world units. */
  altitude: number;
  /**
   * Door orientation. `flipX` mirrors the hinge to the other jamb (along the
   * wall); `flipY` mirrors the swing to the other side of the wall. Together
   * they give the four door orientations. Ignored by windows. Defaults false.
   */
  flipX?: boolean;
  flipY?: boolean;
}

/** A furniture / catalog item placed in the scene. */
export interface Item {
  id: string;
  /** Catalog prototype type, e.g. 'sofa' | 'bed' | 'table'. */
  type: string;
  /** Center position in world coordinates. */
  x: number;
  y: number;
  /** Rotation in degrees, clockwise. */
  rotation: number;
  /** Footprint width in world units. */
  width: number;
  /** Footprint depth in world units. */
  depth: number;
  /** Arbitrary per-prototype properties (color, material, …). */
  properties: Record<string, unknown>;
}

/**
 * A room. DERIVED OUTPUT — produced by area detection (Unit 4). It is never
 * authored by the user, so no slice other than the area slice writes it.
 */
export interface Area {
  id: string;
  /** Ordered cycle of vertex ids forming the room boundary. */
  vertices: string[];
  /** Signed/absolute area in world units², for labels. */
  area: number;
  /** Fill color for rendering. */
  color: string;
}

/** A single design layer. MVP ships exactly one; the map is forward-compat. */
export interface Layer {
  id: string;
  name: string;
  vertices: Record<string, Vertex>;
  lines: Record<string, Line>;
  holes: Record<string, Hole>;
  items: Record<string, Item>;
  areas: Record<string, Area>;
}

export type Unit = 'cm' | 'mm' | 'in';

export interface SceneMeta {
  unit: Unit;
  /** Screen pixels per world unit at zoom = 1. */
  pixelsPerUnit: number;
}

export interface Scene {
  /** Project display name. */
  name: string;
  /** Canvas extent in world units. */
  width: number;
  height: number;
  layers: Record<string, Layer>;
  /** Id of the layer currently being edited. */
  selectedLayer: string;
  meta: SceneMeta;
}

/** The five selectable element kinds. */
export type PrototypeKind = 'vertices' | 'lines' | 'holes' | 'items' | 'areas';

/** Typed selection: one id bucket per element kind (react-planner's shape). */
export type Selection = Record<PrototypeKind, string[]>;

/** Interaction modes. FROZEN — adding a mode is a foundation-only change. */
export type Mode =
  | 'idle'
  | 'drawing-wall'
  | 'drawing-hole'
  | 'placing-item'
  | 'dragging-vertex'
  | 'dragging-item'
  | 'rotating-item'
  | 'panning';

/** Which snap sources are active. Toggled by the toolbar, read by snapping. */
export interface SnapMask {
  grid: boolean;
  vertex: boolean;
  line: boolean;
  guide: boolean;
}

/** Snapshot history for undo/redo (snapshots of `Scene`). */
export interface History {
  past: Scene[];
  future: Scene[];
}

/** A 2D point in world coordinates. */
export interface Point {
  x: number;
  y: number;
}
