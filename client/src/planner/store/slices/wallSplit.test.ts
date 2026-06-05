import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../index';
import { makeSampleScene } from '../../__fixtures__/sampleScene';
import { getSelectedLayer } from '../helpers';
import { splitTool } from '../../tools/splitTool';
import { toolForMode, toolForShortcut } from '../../tools/registry';
import { detectRoomCycles } from '../../utils/areaDetection';
import type { PlannerPointerEvent } from '../../contract/toolTypes';

const layer = () => getSelectedLayer(usePlannerStore.getState().scene);

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().clearSelection();
  usePlannerStore.getState().setMode('idle');
});

describe('splitLine', () => {
  it('replaces a wall with two walls sharing a new corner on the wall', () => {
    const before = layer();
    expect(Object.keys(before.vertices)).toHaveLength(6);
    expect(Object.keys(before.lines)).toHaveLength(7);

    // l-top-left runs v1(100,100) -> v2(500,100). Split at its midpoint.
    const newId = usePlannerStore.getState().splitLine('l-top-left', 300, 100);
    expect(newId).toBeTruthy();

    const l = layer();
    expect(Object.keys(l.vertices)).toHaveLength(7);
    expect(Object.keys(l.lines)).toHaveLength(8);
    expect(l.lines['l-top-left']).toBeUndefined();

    // New corner sits on the wall and joins exactly two walls.
    const v = l.vertices[newId!];
    expect(v).toMatchObject({ x: 300, y: 100 });
    expect(v.lines).toHaveLength(2);

    // v1 no longer references the old wall; the two halves inherit thickness.
    expect(l.vertices.v1.lines).not.toContain('l-top-left');
    for (const lineId of v.lines) expect(l.lines[lineId].thickness).toBe(20);

    // One undo step; undo restores the original wall exactly.
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(Object.keys(layer().vertices)).toHaveLength(6);
    expect(Object.keys(layer().lines)).toHaveLength(7);
    expect(layer().lines['l-top-left']).toBeTruthy();
  });

  it('refuses a degenerate split at (or near) an endpoint', () => {
    const result = usePlannerStore.getState().splitLine('l-top-left', 100, 100); // == v1
    expect(result).toBeNull();
    expect(Object.keys(layer().lines)).toHaveLength(7);
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });

  it('redistributes a hole onto the half it falls in, rescaling its offset', () => {
    // l-left runs v6(100,400) -> v1(100,100) with a door at offset 0.5.
    // Split at (100,200): t = 2/3, so the door (0.5 < 2/3) moves to the first
    // half with offset 0.5 / (2/3) = 0.75.
    const newId = usePlannerStore.getState().splitLine('l-left', 100, 200);
    const l = layer();
    const door = l.holes['h-door'];
    const half = l.lines[door.lineId];
    expect(half.vertices).toContain('v6');
    expect(half.vertices).toContain(newId);
    expect(half.holes).toContain('h-door');
    expect(door.offset).toBeCloseTo(0.75, 5);
  });

  it('keeps both rooms after splitting a perimeter wall (collinear corner)', () => {
    usePlannerStore.getState().splitLine('l-top-left', 300, 100);
    // Two rooms are still detected; the left room just has an extra corner.
    expect(detectRoomCycles(layer())).toHaveLength(2);
  });
});

describe('split tool', () => {
  it('is registered and resolvable by mode + shortcut', () => {
    expect(toolForMode('splitting-wall')).toBe(splitTool);
    expect(toolForShortcut('c')).toBe(splitTool);
  });

  it('splits the clicked wall, selects the new corner, and returns to Select', () => {
    const e = {
      x: 300,
      y: 100,
      snappedX: 300,
      snappedY: 100,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      targetId: 'l-top-left',
      targetKind: 'lines',
      originalEvent: { button: 0, buttons: 1 } as unknown as PlannerPointerEvent['originalEvent'],
    } satisfies PlannerPointerEvent;

    splitTool.handlers!.onPointerDown!(e);

    expect(layer().lines['l-top-left']).toBeUndefined();
    expect(usePlannerStore.getState().mode).toBe('idle');
    const selected = usePlannerStore.getState().selected.vertices;
    expect(selected).toHaveLength(1);
    expect(layer().vertices[selected[0]]).toMatchObject({ x: 300, y: 100 });
  });
});
