// Driving the select tool's door/window slide gesture at the handler level.
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

const hole = (id: string) => getSelectedLayer(usePlannerStore.getState().scene).holes[id];

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().clearSelection();
  usePlannerStore.getState().setMode('idle');
});

describe('selectTool — slide a door/window', () => {
  it('selects the hole and slides it along its wall (one undo step)', () => {
    // h-door sits on l-left (v6 100,400 -> v1 100,100) at offset 0.5.
    handlers.onPointerDown!(ev({ x: 100, y: 250, targetId: 'h-door', targetKind: 'holes' }));
    expect(usePlannerStore.getState().selected.holes).toContain('h-door');

    // Cursor at (100,200) projects to t = 2/3 along the wall.
    handlers.onPointerMove!(ev({ x: 100, y: 200 }));
    expect(hole('h-door').offset).toBeCloseTo(2 / 3, 5);

    handlers.onPointerUp!(up);
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(hole('h-door').offset).toBe(0.5);
  });

  it('clamps the slide so the hole stays inside the wall', () => {
    handlers.onPointerDown!(ev({ x: 100, y: 250, targetId: 'h-door', targetKind: 'holes' }));
    // Drag to the v1 end (t = 1); door width 90 / wall 300 → max offset 0.85.
    handlers.onPointerMove!(ev({ x: 100, y: 100 }));
    expect(hole('h-door').offset).toBeCloseTo(0.85, 5);
    handlers.onPointerUp!(up);
  });
});
