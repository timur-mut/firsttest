// When two collinear walls (the wall continues, 180°) have different
// thicknesses, the inner boundary must step between the two thicknesses.
import { describe, it, expect } from 'vitest';
import { computeRooms } from './areaDetection';
import type { Layer, Point } from '../contract/types';

function buildLayer(
  verts: Record<string, { x: number; y: number }>,
  edges: [string, string, number][], // [a, b, thickness]
): Layer {
  const vertices: Layer['vertices'] = {};
  for (const [id, p] of Object.entries(verts)) vertices[id] = { id, x: p.x, y: p.y, lines: [] };
  const lines: Layer['lines'] = {};
  edges.forEach(([a, b, t], i) => {
    const id = `l${i}`;
    lines[id] = { id, type: 'wall', vertices: [a, b], thickness: t, height: 280, holes: [] };
    vertices[a].lines.push(id);
    vertices[b].lines.push(id);
  });
  return { id: 'L', name: 'L', vertices, lines, holes: {}, items: {}, areas: {} };
}

const has = (poly: Point[], x: number, y: number) =>
  poly.some((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6);

describe('computeRooms — step between collinear walls of different thickness', () => {
  // Square room (100×100 outer) whose TOP edge is two collinear walls meeting at
  // m(50,0): a-m is 20 thick, m-b is 40 thick. Interior is below (inward +y).
  const layer = buildLayer(
    { a: { x: 0, y: 0 }, m: { x: 50, y: 0 }, b: { x: 100, y: 0 }, c: { x: 100, y: 100 }, d: { x: 0, y: 100 } },
    [
      ['a', 'm', 20],
      ['m', 'b', 40],
      ['b', 'c', 20],
      ['c', 'd', 20],
      ['d', 'a', 20],
    ],
  );
  const room = computeRooms(layer)[0];

  it('adds a perpendicular step at the thickness change', () => {
    expect(room).toBeTruthy();
    // Two inner points at the junction: 20 deep (thin side) and 40 deep (thick).
    expect(has(room.inner, 50, 20)).toBe(true);
    expect(has(room.inner, 50, 40)).toBe(true);
    // A plain rectangle would be 4 inner corners; the step adds two more.
    expect(room.inner.length).toBe(6);
  });

  it('the inner area reflects the thicker section', () => {
    // 60×60 (=3600) minus the extra-thick notch 30 wide × 20 deep (=600) → 3000.
    expect(room.area).toBeCloseTo(3000, 5);
  });

  it('each wall keeps its own thickness at the junction', () => {
    const am = room.walls.find((w) => w.lineId === 'l0')!; // a-m, 20 thick
    const mb = room.walls.find((w) => w.lineId === 'l1')!; // m-b, 40 thick
    expect(has(am.quad, 50, 20)).toBe(true);
    expect(has(mb.quad, 50, 40)).toBe(true);
  });

  it('equal-thickness collinear walls produce NO step (no extra inner points)', () => {
    const flat = buildLayer(
      { a: { x: 0, y: 0 }, m: { x: 50, y: 0 }, b: { x: 100, y: 0 }, c: { x: 100, y: 100 }, d: { x: 0, y: 100 } },
      [
        ['a', 'm', 20],
        ['m', 'b', 20],
        ['b', 'c', 20],
        ['c', 'd', 20],
        ['d', 'a', 20],
      ],
    );
    const r = computeRooms(flat)[0];
    // The collinear same-thickness join is straight → its inner points collapse.
    expect(r.inner.length).toBe(4);
    expect(r.area).toBeCloseTo(60 * 60, 5);
  });
});
