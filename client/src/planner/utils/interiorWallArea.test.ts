// Non-closing interior walls (stubs / partial partitions) stand on a room's
// floor, so their footprint is subtracted from the room's reported area.
//
// Canonical sample = two rooms sharing a middle wall. Room A (the left room,
// containing v6) has inner floor rect x∈[120,490], y∈[120,380] → 370×260 =
// 96 200 cm². We drop stub walls into it and check the area accounting.

import { describe, it, expect } from 'vitest';
import { computeRooms, detectAreas } from './areaDetection';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import type { Layer } from '../contract/types';

/** Sample layer with one extra free-standing wall v7->v8 (degree-1 ends). */
function withStub(ax: number, ay: number, bx: number, by: number, thickness: number): Layer {
  const layer = makeSampleScene().layers['layer-1'];
  layer.vertices.v7 = { id: 'v7', x: ax, y: ay, lines: ['l-stub'] };
  layer.vertices.v8 = { id: 'v8', x: bx, y: by, lines: ['l-stub'] };
  layer.lines['l-stub'] = {
    id: 'l-stub',
    type: 'wall',
    vertices: ['v7', 'v8'],
    thickness,
    height: 280,
    holes: [],
  };
  return layer;
}

const roomA = (layer: Layer) => computeRooms(layer).find((r) => r.cycle.includes('v6'))!;
const roomB = (layer: Layer) => computeRooms(layer).find((r) => r.cycle.includes('v3'))!;

describe('interior non-closing walls subtract from room area', () => {
  it('does not change room count or areas when there is no stub', () => {
    const layer = makeSampleScene().layers['layer-1'];
    const rooms = computeRooms(layer);
    expect(rooms).toHaveLength(2);
    for (const r of rooms) expect(r.area).toBeCloseTo(96200, 5);
  });

  it('subtracts a free-standing stub fully inside the room (length × thickness)', () => {
    // Horizontal wall (200,250)->(400,250): length 200, thickness 10 → 2000 cm².
    const layer = withStub(200, 250, 400, 250, 10);
    expect(computeRooms(layer)).toHaveLength(2); // stub does not create a room
    expect(roomA(layer).area).toBeCloseTo(96200 - 2000, 5);
    // The other room is untouched.
    expect(roomB(layer).area).toBeCloseTo(96200, 5);
  });

  it('only counts the part of the wall standing on the floor (clips to floor)', () => {
    // (50,250)->(300,250) runs in from outside through the wall band; only the
    // x∈[120,300] part (length 180) is on the floor → 180 × 10 = 1800 cm².
    const layer = withStub(50, 250, 300, 250, 10);
    expect(roomA(layer).area).toBeCloseTo(96200 - 1800, 5);
  });

  it('scales the subtraction with wall thickness', () => {
    const layer = withStub(200, 250, 400, 250, 30); // 200 × 30 = 6000 cm².
    expect(roomA(layer).area).toBeCloseTo(96200 - 6000, 5);
  });

  it('ignores a wall that stands outside every room', () => {
    const layer = withStub(2000, 2000, 2200, 2000, 10);
    for (const r of computeRooms(layer)) expect(r.area).toBeCloseTo(96200, 5);
  });

  it('is reflected in detectAreas (the stored/labelled area)', () => {
    const layer = withStub(200, 250, 400, 250, 10);
    const area = Object.values(detectAreas(layer)).find((a) => a.vertices.includes('v6'))!;
    expect(area.area).toBeCloseTo(94200, 5);
  });

  it('never reports a negative area', () => {
    // A very thick stub spanning the room cannot drive the area below zero.
    const layer = withStub(130, 250, 480, 250, 1000);
    expect(roomA(layer).area).toBeGreaterThanOrEqual(0);
  });
});
