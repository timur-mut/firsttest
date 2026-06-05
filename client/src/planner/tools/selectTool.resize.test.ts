// Driving the select tool's item-resize gesture (corner handle) at the handler level.
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

const sofa = () => getSelectedLayer(usePlannerStore.getState().scene).items['i-sofa'];

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene()); // sofa at (300,300), 180×90, rot 0
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().clearSelection();
  usePlannerStore.getState().setMode('idle');
});

describe('selectTool — resize an item via a corner handle', () => {
  it('resizes symmetrically about the centre (one undo step)', () => {
    handlers.onPointerDown!(ev({ x: 390, y: 345, targetId: 'i-sofa', targetKind: 'items', handle: 'resize' }));
    expect(usePlannerStore.getState().selected.items).toContain('i-sofa');

    // Cursor at (400,360): local (100,60) → width 200, depth 120.
    handlers.onPointerMove!(ev({ x: 400, y: 360 }));
    expect(sofa()).toMatchObject({ width: 200, depth: 120 });

    handlers.onPointerUp!(up);
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(sofa()).toMatchObject({ width: 180, depth: 90 });
  });

  it('clamps to a minimum size', () => {
    handlers.onPointerDown!(ev({ x: 390, y: 345, targetId: 'i-sofa', targetKind: 'items', handle: 'resize' }));
    handlers.onPointerMove!(ev({ x: 300, y: 300 })); // at the centre → both extents 0 → min
    expect(sofa()).toMatchObject({ width: 10, depth: 10 });
    handlers.onPointerUp!(up);
  });

  it('computes extents in the item local frame when rotated', () => {
    usePlannerStore.getState().rotateItem('i-sofa', 90);
    usePlannerStore.getState().clearHistory();
    handlers.onPointerDown!(ev({ x: 360, y: 340, targetId: 'i-sofa', targetKind: 'items', handle: 'resize' }));
    // rotation 90: local = (dy, -dx) of (60,40) → (40,-60) → width 80, depth 120.
    handlers.onPointerMove!(ev({ x: 360, y: 340 }));
    expect(sofa().width).toBeCloseTo(80, 6);
    expect(sofa().depth).toBeCloseTo(120, 6);
    handlers.onPointerUp!(up);
  });
});
