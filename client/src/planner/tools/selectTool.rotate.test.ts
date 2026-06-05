// Drives the select tool's rotate-handle gesture at the handler level.
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

function sofa() {
  return getSelectedLayer(usePlannerStore.getState().scene).items['i-sofa'];
}

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene()); // sofa at (300,300), rotation 0
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().clearSelection();
  usePlannerStore.getState().setMode('idle');
});

describe('selectTool — rotate handle', () => {
  it('rotates the item about its centre and keeps it selected', () => {
    // Grab the rotate handle of the sofa.
    handlers.onPointerDown!(ev({ x: 300, y: 220, targetId: 'i-sofa', targetKind: 'items', handle: 'rotate' }));
    expect(usePlannerStore.getState().selected.items).toContain('i-sofa');

    // Cursor directly to the RIGHT of the centre → 90°.
    handlers.onPointerMove!(ev({ x: 400, y: 300 }));
    expect(sofa().rotation).toBe(90);

    // Cursor directly BELOW the centre → 180°.
    handlers.onPointerMove!(ev({ x: 300, y: 400 }));
    expect(sofa().rotation).toBe(180);

    handlers.onPointerUp!(up);

    // One undo step for the whole gesture; undo restores rotation 0.
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(sofa().rotation).toBe(0);
  });

  it('snaps rotation to 15° increments while Shift is held', () => {
    handlers.onPointerDown!(ev({ x: 300, y: 220, targetId: 'i-sofa', targetKind: 'items', handle: 'rotate' }));
    // An off-axis cursor with Shift held should land on a multiple of 15°.
    handlers.onPointerMove!(ev({ x: 372, y: 250, shiftKey: true }));
    handlers.onPointerUp!(up);
    expect(sofa().rotation % 15).toBe(0);
  });

  it('grabbing the handle without moving does not rotate or record history', () => {
    handlers.onPointerDown!(ev({ x: 300, y: 220, targetId: 'i-sofa', targetKind: 'items', handle: 'rotate' }));
    handlers.onPointerUp!(up);
    expect(sofa().rotation).toBe(0);
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });
});
