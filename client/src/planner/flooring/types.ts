// Flooring model — owned by the flooring feature.
//
// A `Flooring` is a per-room override (stored on `Area.flooring`) describing
// which floor covering is laid in the room and how it is laid out. It is purely
// presentational: it never affects wall geometry or area detection, only how the
// room's floor polygon is painted on the plan.

/** The nine selectable floor coverings. */
export type FlooringType =
  | 'porcelain-stoneware'
  | 'tile'
  | 'laminate'
  | 'linoleum'
  | 'quartz-vinyl'
  | 'parquet'
  | 'solid-parquet'
  | 'self-leveling'
  | 'carpet';

/**
 * Layout pattern for the covering's elements.
 *   grid        — aligned tiles (square/rectangular)
 *   plank       — aligned planks (long boards, no offset)
 *   brick       — running bond; every other course offset by half an element
 *   diagonal    — aligned grid rotated 45°
 *   herringbone — perpendicular planks interlocked in a zig-zag weave
 *   chevron     — mitred planks meeting point-to-point along vertical seams
 *   solid       — seamless sheet (no element seams)
 */
export type FlooringPattern =
  | 'grid'
  | 'plank'
  | 'brick'
  | 'diagonal'
  | 'herringbone'
  | 'chevron'
  | 'solid';

/** Per-room floor covering. All sizes are in world units (Scene.meta.unit). */
export interface Flooring {
  type: FlooringType;
  /** Element width (short side of a plank / a tile side / sheet width). */
  width: number;
  /** Element length (long side of a plank / a tile side). */
  length: number;
  /** Layout pattern. */
  pattern: FlooringPattern;
  /** Whole-pattern rotation in degrees, clockwise. */
  angle: number;
  /** Pattern origin shift in world units (drag-to-reposition the layout). */
  offsetX: number;
  offsetY: number;
  /** Main element fill colour. */
  color: string;
  /** Seam / grout colour drawn between elements. */
  seamColor: string;
}
