import { describe, expect, it } from 'vitest';
import { boundsOf, generateTiles, type Bounds, type Tile } from './patterns';
import { makeFlooring } from './catalog';
import type { FlooringPattern } from './types';

const BOUNDS: Bounds = { minX: 0, minY: 0, maxX: 240, maxY: 180 };

/** Ray-cast point-in-polygon (polygon given as a list of vertices). */
function inPolygon(px: number, py: number, poly: Tile): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Sample interior points (offset off the grid lines to dodge edge ambiguity). */
function uncoveredPoints(tiles: Tile[]): number {
  let misses = 0;
  for (let x = BOUNDS.minX + 3.37; x < BOUNDS.maxX - 3; x += 11.13) {
    for (let y = BOUNDS.minY + 3.71; y < BOUNDS.maxY - 3; y += 9.27) {
      if (!tiles.some((t) => inPolygon(x, y, t))) misses++;
    }
  }
  return misses;
}

describe('generateTiles', () => {
  it('returns no tiles for a solid covering', () => {
    expect(generateTiles(makeFlooring('carpet'), BOUNDS)).toEqual([]);
    expect(generateTiles(makeFlooring('self-leveling'), BOUNDS)).toEqual([]);
  });

  const patterns: { pattern: FlooringPattern; width: number; length: number }[] = [
    { pattern: 'grid', width: 30, length: 30 },
    { pattern: 'plank', width: 19, length: 128 },
    { pattern: 'brick', width: 30, length: 30 },
    { pattern: 'diagonal', width: 30, length: 30 },
    { pattern: 'herringbone', width: 14, length: 90 },
    { pattern: 'chevron', width: 14, length: 90 },
  ];

  for (const { pattern, width, length } of patterns) {
    it(`covers the room with no gaps — ${pattern}`, () => {
      const flooring = makeFlooring('tile', { pattern, width, length });
      const tiles = generateTiles(flooring, BOUNDS);
      expect(tiles.length).toBeGreaterThan(0);
      expect(uncoveredPoints(tiles)).toBe(0);
    });
  }

  it('translates the layout rigidly by the offset', () => {
    const dx = 37;
    const dy = -11;
    const base = generateTiles(makeFlooring('tile', { pattern: 'grid' }), BOUNDS);
    const moved = generateTiles(
      makeFlooring('tile', { pattern: 'grid', offsetX: dx, offsetY: dy }),
      BOUNDS,
    );
    const movedPts = moved.flat();
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    // Pick an interior base corner (away from the edge cells) and confirm the
    // same corner exists in the offset output shifted by exactly (dx, dy).
    const inside = base
      .flat()
      .find(
        (p) =>
          p.x > BOUNDS.minX + 40 &&
          p.x < BOUNDS.maxX - 40 &&
          p.y > BOUNDS.minY + 40 &&
          p.y < BOUNDS.maxY - 40,
      )!;
    expect(movedPts.some((p) => near(p.x, inside.x + dx) && near(p.y, inside.y + dy))).toBe(
      true,
    );
  });

  it('offsets in world space regardless of pattern angle (drag follows cursor)', () => {
    // Diagonal-style 45° pattern: a world-space offset must move tiles by that
    // exact world vector, not a rotated one.
    const dx = 50;
    const dy = 0;
    const base = generateTiles(makeFlooring('tile', { pattern: 'grid', angle: 45 }), BOUNDS);
    const moved = generateTiles(
      makeFlooring('tile', { pattern: 'grid', angle: 45, offsetX: dx, offsetY: dy }),
      BOUNDS,
    );
    const movedPts = moved.flat();
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    const inside = base
      .flat()
      .find(
        (p) =>
          p.x > BOUNDS.minX + 60 &&
          p.x < BOUNDS.maxX - 60 &&
          p.y > BOUNDS.minY + 60 &&
          p.y < BOUNDS.maxY - 60,
      )!;
    // The same corner must reappear shifted by exactly (dx, dy) in world space.
    expect(movedPts.some((p) => near(p.x, inside.x + dx) && near(p.y, inside.y + dy))).toBe(
      true,
    );
  });

  it('still covers the room with no gaps after an offset', () => {
    const tiles = generateTiles(
      makeFlooring('parquet', { pattern: 'herringbone', offsetX: 19, offsetY: 23 }),
      BOUNDS,
    );
    expect(uncoveredPoints(tiles)).toBe(0);
  });

  it('rotates the pattern when angle is set', () => {
    const flat = generateTiles(makeFlooring('tile', { pattern: 'grid', angle: 0 }), BOUNDS);
    const turned = generateTiles(makeFlooring('tile', { pattern: 'grid', angle: 30 }), BOUNDS);
    // A 30° grid is not axis-aligned, so at least one tile edge is slanted.
    const flatB = boundsOf(flat.flat());
    const turnedB = boundsOf(turned.flat());
    expect(turnedB.minX).toBeLessThan(flatB.minX); // rotated tiles overshoot the bbox
  });
});
