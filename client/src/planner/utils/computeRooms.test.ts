import { describe, it, expect } from 'vitest';
import { computeRooms } from './areaDetection';
import { makeSampleScene } from '../__fixtures__/sampleScene';

describe('computeRooms — wall thickness geometry', () => {
  const layer = makeSampleScene().layers['layer-1'];
  const rooms = computeRooms(layer);

  it('finds two rooms with inner area + perimeter accounting for thickness', () => {
    expect(rooms).toHaveLength(2);
    for (const room of rooms) {
      // Inner 370 × 260 → area 96200, perimeter 2*(370+260) = 1260.
      expect(room.area).toBeCloseTo(96200, 5);
      expect(room.perimeter).toBeCloseTo(1260, 5);
      // Outer corners are the room's vertices (4-cycle).
      expect(room.outer).toHaveLength(4);
      expect(room.inner).toHaveLength(4);
    }
  });

  it('treats the shared middle wall as bordering both rooms', () => {
    const roomsWithMid = rooms.filter((r) => r.walls.some((w) => w.lineId === 'l-mid'));
    expect(roomsWithMid).toHaveLength(2);
  });

  it('emits a mitered quad per wall with the outer corners on the vertices', () => {
    const left = rooms.find((r) => new Set(r.cycle).has('v6'))!;
    expect(left.walls).toHaveLength(4);
    // Every wall quad is a 4-point trapezoid.
    for (const w of left.walls) expect(w.quad).toHaveLength(4);
    // The outer corners coincide with the room's outer vertices.
    const outerKeys = new Set(left.outer.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`));
    for (const w of left.walls) {
      expect(outerKeys.has(`${Math.round(w.quad[0].x)},${Math.round(w.quad[0].y)}`)).toBe(true);
      expect(outerKeys.has(`${Math.round(w.quad[1].x)},${Math.round(w.quad[1].y)}`)).toBe(true);
    }
  });
});
