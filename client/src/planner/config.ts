// Shared planner constants. Foundation-owned.

/** Grid spacing in world units. */
export const GRID_SIZE = 20;
/** Snap radius in screen pixels (converted to world units using the scale). */
export const SNAP_RADIUS_PX = 12;
/** Zoom clamp. */
export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 20;
/** Angle increment (degrees) used when drawing walls with Shift held. */
export const ANGLE_SNAP_STEP = 15;
/** Max number of undo snapshots retained. */
export const HISTORY_LIMIT = 100;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
