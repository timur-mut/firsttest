// Drives the select tool's corner (vertex) drag gesture at the handler level.
import { describe, it, expect, beforeEach } from 'vitest';
import { selectTool } from './selectTool';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import { getSelectedLayer } from '../store/helpers';
import type { PlannerPointerEvent } from '../contract/toolTypes';

const handlers = selectTool.handlers!;

function ev(partial: Partial<PlannerPointerEvent>): PlannerPointerEvent {
  return {
    x: 0,
    y: 0,
    snappedX: 0,
    snappedY: 0,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    originalEvent: { button: 0, buttons: 1 } as unknown as PlannerPointerEvent['originalEvent'],
    ...partial,
  };
}

const up = ev({ originalEvent: { button: 0, buttons: 0 } as unknown as PlannerPointerEvent['originalEvent'] });

function layer() {
  return getSelectedLayer(usePlannerStore.getState().scene);
}

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().clearSelection();
  usePlannerStore.getState().setMode('idle');
  if (usePlannerStore.getState().snapMask.grid) usePlannerStore.getState().toggleSnap('grid');
});

describe('selectTool — select & drag a corner', () => {
  it('selects the corner and moves it (respecting the grab offset)', () => {
    // Grab vertex v2 (500,100) slightly off-centre to exercise the offset.
    handlers.onPointerDown!(ev({ x: 505, y: 103, targetId: 'v2', targetKind: 'vertices' }));
    expect(usePlannerStore.getState().selected.vertices).toContain('v2');

    // Cursor to (535,143) → target = cursor + offset(-5,-3) = (530,140).
    handlers.onPointerMove!(ev({ x: 535, y: 143 }));
    handlers.onPointerUp!(up);

    expect(layer().vertices.v2).toMatchObject({ x: 530, y: 140 });
    // One undo step for the whole gesture; undo restores the corner.
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(layer().vertices.v2).toMatchObject({ x: 500, y: 100 });
  });

  it('moving a shared corner moves every wall attached to it', () => {
    // v2 is shared by l-top-left, l-top-right and l-mid.
    handlers.onPointerDown!(ev({ x: 500, y: 100, targetId: 'v2', targetKind: 'vertices' }));
    handlers.onPointerMove!(ev({ x: 520, y: 120 }));
    handlers.onPointerUp!(up);

    const v2 = layer().vertices.v2;
    expect(v2).toMatchObject({ x: 520, y: 120 });
    // The shared vertex is still wired to all three walls (geometry just moved).
    expect(v2.lines).toEqual(expect.arrayContaining(['l-top-left', 'l-top-right', 'l-mid']));
  });

  it('clicking a corner without moving selects but does not move it', () => {
    handlers.onPointerDown!(ev({ x: 100, y: 100, targetId: 'v1', targetKind: 'vertices' }));
    handlers.onPointerUp!(up);
    expect(usePlannerStore.getState().selected.vertices).toContain('v1');
    expect(layer().vertices.v1).toMatchObject({ x: 100, y: 100 });
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });
});
