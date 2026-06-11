// Floor pattern geometry — pure functions that turn a `Flooring` + a room's
// bounding box into a list of element polygons (tiles / planks) in world
// coordinates. The renderer paints each polygon and clips the whole set to the
// room's floor polygon, so generators may freely overshoot the bounds.
//
// All generation happens in a LOCAL axis-aligned frame (the world rotated by
// -angle about the room centre); every emitted point is rotated back by +angle,
// so a single rotation handles `angle` and the 45° of the diagonal pattern.

import type { Point } from '../contract/types';
import type { Flooring } from './types';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** A single element outline: a closed polygon of world-space points. */
export type Tile = Point[];

const TAU = Math.PI / 180;

export function boundsOf(points: Point[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function center(b: Bounds): Point {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

/** Rotate `p` by `angleDeg` (clockwise in screen space) about `c`. */
function rotate(p: Point, c: Point, sin: number, cos: number): Point {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

/** Axis-aligned rectangle as a 4-point polygon. */
function rect(x: number, y: number, w: number, h: number): Tile {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** Snap `v` down to the previous multiple of `step` (grid anchored at origin). */
function floorTo(v: number, step: number): number {
  return Math.floor(v / step) * step;
}

/**
 * The local-frame region to fill: the room bbox corners rotated by -angle about
 * the centre, then bounded and padded by one element so rotation never leaves a
 * gap at the edges.
 */
function localRegion(b: Bounds, c: Point, angleDeg: number, pad: number): Bounds {
  const sin = Math.sin(-angleDeg * TAU);
  const cos = Math.cos(-angleDeg * TAU);
  const corners = [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY },
    { x: b.minX, y: b.maxY },
  ].map((p) => rotate(p, c, sin, cos));
  const lb = boundsOf(corners);
  return { minX: lb.minX - pad, minY: lb.minY - pad, maxX: lb.maxX + pad, maxY: lb.maxY + pad };
}

// ── Per-pattern local generators (axis-aligned, in the local frame) ──────────

/** Aligned tiles/planks of `w` × `l`. */
function gridTiles(r: Bounds, w: number, l: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = floorTo(r.minY, l); y < r.maxY; y += l) {
    for (let x = floorTo(r.minX, w); x < r.maxX; x += w) {
      tiles.push(rect(x, y, w, l));
    }
  }
  return tiles;
}

/** Running-bond: every other course shifted by half an element width. */
function brickTiles(r: Bounds, w: number, l: number): Tile[] {
  const tiles: Tile[] = [];
  let row = 0;
  for (let y = floorTo(r.minY, l); y < r.maxY; y += l, row++) {
    const shift = row % 2 === 0 ? 0 : w / 2;
    for (let x = floorTo(r.minX - shift, w) + shift; x < r.maxX; x += w) {
      tiles.push(rect(x, y, w, l));
    }
  }
  return tiles;
}

/**
 * Herringbone: L×W planks (length `l`, width `w`) interlocked at right angles.
 * Filled greedily over a W-cell grid so coverage is always gap-free; each free
 * cell starts a plank whose orientation follows the diagonal-band rule that
 * produces the classic weave. Planks are shortened only where they would run
 * into already-placed cells (at the very edges, hidden by clipping).
 */
function herringboneTiles(r: Bounds, w: number, l: number): Tile[] {
  const k = Math.max(2, Math.round(l / w)); // plank length in whole cells
  const x0 = floorTo(r.minX, w);
  const y0 = floorTo(r.minY, w);
  const cols = Math.ceil((r.maxX - x0) / w) + k;
  const rows = Math.ceil((r.maxY - y0) / w) + k;
  const covered = new Set<number>();
  const idx = (a: number, b: number) => b * (cols + 1) + a;
  const tiles: Tile[] = [];

  for (let b = 0; b < rows; b++) {
    for (let a = 0; a < cols; a++) {
      if (covered.has(idx(a, b))) continue;
      // Diagonal bands of width k alternate orientation -> herringbone weave.
      const horizontal = Math.floor((a + b) / k) % 2 === 0;
      let len = 0;
      if (horizontal) {
        while (len < k && a + len < cols && !covered.has(idx(a + len, b))) len++;
        for (let i = 0; i < len; i++) covered.add(idx(a + i, b));
        tiles.push(rect(x0 + a * w, y0 + b * w, len * w, w));
      } else {
        while (len < k && b + len < rows && !covered.has(idx(a, b + len))) len++;
        for (let i = 0; i < len; i++) covered.add(idx(a, b + i));
        tiles.push(rect(x0 + a * w, y0 + b * w, w, len * w));
      }
    }
  }
  return tiles;
}

/**
 * Chevron: planks sheared into parallelograms with vertical sides and ±45°
 * slanted ends. Columns alternate slope and are offset so neighbouring planks
 * meet point-to-point along each vertical seam, forming continuous "V" courses.
 * `l` is the plank length (its slanted run), `w` the perpendicular width.
 */
function chevronTiles(r: Bounds, w: number, l: number): Tile[] {
  const tiles: Tile[] = [];
  const cw = l / Math.SQRT2; // horizontal span of a 45° plank
  const p = w * Math.SQRT2; // vertical period giving perpendicular width `w`
  const ci0 = Math.floor((r.minX - cw) / cw);
  for (let ci = ci0; ci * cw < r.maxX + cw; ci++) {
    const x = ci * cw;
    const parity = ((ci % 2) + 2) % 2;
    const slope = parity === 0 ? cw : -cw; // rise across the column
    const offset = parity === 0 ? 0 : cw; // align Vs across the seam
    for (let y = floorTo(r.minY - p - cw, p) + offset; y < r.maxY + cw; y += p) {
      tiles.push([
        { x, y },
        { x: x + cw, y: y + slope },
        { x: x + cw, y: y + slope + p },
        { x, y: y + p },
      ]);
    }
  }
  return tiles;
}

/**
 * Generate the element polygons for a room's flooring, in world coordinates.
 * Returns an empty list for the `solid` pattern (the base fill stands in).
 */
export function generateTiles(flooring: Flooring, bounds: Bounds): Tile[] {
  const { pattern } = flooring;
  if (pattern === 'solid') return [];

  const w = Math.max(1, flooring.width);
  const l = Math.max(1, flooring.length);
  const offX = flooring.offsetX ?? 0;
  const offY = flooring.offsetY ?? 0;

  // The layout is rotated about the room's true centre, then translated by the
  // offset in WORLD space — so a drag always slides the pattern along the
  // cursor, independent of the pattern angle. For coverage we generate over the
  // region shifted by -offset (it ends up back over the room after the +offset).
  const c = center(bounds);
  const covered: Bounds = {
    minX: bounds.minX - offX,
    minY: bounds.minY - offY,
    maxX: bounds.maxX - offX,
    maxY: bounds.maxY - offY,
  };
  const angle = flooring.angle + (pattern === 'diagonal' ? 45 : 0);
  const pad = Math.max(w, l) * 2;
  const region = localRegion(covered, c, angle, pad);

  let local: Tile[];
  switch (pattern) {
    case 'brick':
      local = brickTiles(region, w, l);
      break;
    case 'herringbone':
      local = herringboneTiles(region, w, l);
      break;
    case 'chevron':
      local = chevronTiles(region, w, l);
      break;
    case 'grid':
    case 'plank':
    case 'diagonal':
    default:
      local = gridTiles(region, w, l);
      break;
  }

  const rot = angle !== 0;
  const sin = rot ? Math.sin(angle * TAU) : 0;
  const cos = rot ? Math.cos(angle * TAU) : 1;
  return local.map((tile) =>
    tile.map((p) => {
      const r = rot ? rotate(p, c, sin, cos) : p;
      return { x: r.x + offX, y: r.y + offY };
    }),
  );
}
