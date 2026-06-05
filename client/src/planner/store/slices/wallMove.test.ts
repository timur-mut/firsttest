// Tests for translating a whole wall (moveLine).
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../index';
import { makeSampleScene } from '../../__fixtures__/sampleScene';
import { getSelectedLayer } from '../helpers';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

function layer() {
  return getSelectedLayer(usePlannerStore.getState().scene);
}

describe('moveLine', () => {
  it('translates both endpoints of a wall by the delta', () => {
    // l-top-left runs v1(100,100) -> v2(500,100).
    usePlannerStore.getState().moveLine('l-top-left', 40, -20);
    const l = layer();
    expect(l.vertices.v1).toMatchObject({ x: 140, y: 80 });
    expect(l.vertices.v2).toMatchObject({ x: 540, y: 80 });
  });

  it('moves shared corners so adjacent walls follow', () => {
    // v2 is shared by l-top-left, l-top-right and l-mid. Moving l-top-left
    // moves v2, which is the same vertex those walls reference.
    const before = { ...layer().vertices.v2 };
    usePlannerStore.getState().moveLine('l-top-left', 10, 10);
    const v2 = layer().vertices.v2;
    expect(v2.x).toBe(before.x + 10);
    expect(v2.y).toBe(before.y + 10);
    // The shared vertex is still referenced by all three walls.
    expect(v2.lines).toEqual(expect.arrayContaining(['l-top-left', 'l-top-right', 'l-mid']));
  });

  it('records exactly one undo step and reverts cleanly', () => {
    usePlannerStore.getState().moveLine('l-left', 25, 0);
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(layer().vertices.v1).toMatchObject({ x: 100, y: 100 });
    expect(layer().vertices.v6).toMatchObject({ x: 100, y: 400 });
  });

  it('is a no-op for an unknown line or a zero delta', () => {
    usePlannerStore.getState().moveLine('does-not-exist', 10, 10);
    usePlannerStore.getState().moveLine('l-top-left', 0, 0);
    expect(usePlannerStore.getState().history.past.length).toBe(0);
    expect(layer().vertices.v1).toMatchObject({ x: 100, y: 100 });
  });
});
