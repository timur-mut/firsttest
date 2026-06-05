// Drives the select tool's wall-drag gesture directly (handler-level), which is
// more deterministic than dispatching synthetic DOM pointer events.
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

function layer() {
  return getSelectedLayer(usePlannerStore.getState().scene);
}

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().clearSelection();
  usePlannerStore.getState().setMode('idle');
  // Turn grid snapping off so the drag delta is applied continuously.
  if (usePlannerStore.getState().snapMask.grid) usePlannerStore.getState().toggleSnap('grid');
});

describe('selectTool — drag a wall to move it', () => {
  it('translates the wall by the drag delta and records one undo step', () => {
    // l-mid runs v2(500,100) -> v5(500,400).
    handlers.onPointerDown!(ev({ x: 500, y: 250, targetId: 'l-mid', targetKind: 'lines' }));
    // Wall got selected.
    expect(usePlannerStore.getState().selected.lines).toContain('l-mid');

    handlers.onPointerMove!(ev({ x: 540, y: 250 }));
    handlers.onPointerMove!(ev({ x: 560, y: 230 }));
    handlers.onPointerUp!(ev({ originalEvent: { button: 0, buttons: 0 } as unknown as PlannerPointerEvent['originalEvent'] }));

    // Both endpoints translated by the total delta (+60, -20).
    expect(layer().vertices.v2).toMatchObject({ x: 560, y: 80 });
    expect(layer().vertices.v5).toMatchObject({ x: 560, y: 380 });

    // The whole gesture is a single undo step.
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(layer().vertices.v2).toMatchObject({ x: 500, y: 100 });
    expect(layer().vertices.v5).toMatchObject({ x: 500, y: 400 });
  });

  it('clicking a wall without moving selects but does not move it', () => {
    handlers.onPointerDown!(ev({ x: 500, y: 250, targetId: 'l-mid', targetKind: 'lines' }));
    handlers.onPointerUp!(ev({ originalEvent: { button: 0, buttons: 0 } as unknown as PlannerPointerEvent['originalEvent'] }));
    expect(layer().vertices.v2).toMatchObject({ x: 500, y: 100 });
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });
});
