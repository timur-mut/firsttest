import { describe, it, expect } from 'vitest';
import { insetPolygon, lineIntersection, polygonArea, polygonPerimeter } from './geometry';

const sq = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe('polygonPerimeter', () => {
  it('sums the edges of a closed polygon', () => {
    expect(polygonPerimeter(sq)).toBe(400);
  });
});

describe('lineIntersection', () => {
  it('finds the crossing of two lines', () => {
    const p = lineIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: -5 }, { x: 0, y: 1 });
    expect(p).toMatchObject({ x: 5, y: 0 });
  });
  it('returns null for parallel lines', () => {
    expect(lineIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 5 }, { x: 1, y: 0 })).toBeNull();
  });
});

describe('insetPolygon', () => {
  it('insets a square inward by a uniform thickness (mitered)', () => {
    const inner = insetPolygon(sq, [10, 10, 10, 10]);
    // Inner square is 80×80 = 6400, inset 10 on every side.
    expect(polygonArea(inner)).toBeCloseTo(6400, 6);
    const xs = inner.map((p) => p.x).sort((a, b) => a - b);
    const ys = inner.map((p) => p.y).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(10, 6);
    expect(xs[3]).toBeCloseTo(90, 6);
    expect(ys[0]).toBeCloseTo(10, 6);
    expect(ys[3]).toBeCloseTo(90, 6);
  });

  it('supports per-edge thickness (e.g. one thinner shared wall)', () => {
    // Inset the right edge by 5 instead of 10 → inner width 85, height 80.
    const inner = insetPolygon(sq, [10, 5, 10, 10]);
    expect(polygonArea(inner)).toBeCloseTo(85 * 80, 6);
  });
});
