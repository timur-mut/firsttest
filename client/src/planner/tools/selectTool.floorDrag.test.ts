// Drives the select tool's floor-layout drag gesture at the handler level.
import { describe, it, expect, beforeEach } from 'vitest';
import { selectTool } from './selectTool';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import { getSelectedLayer } from '../store/helpers';
import { roomId } from '../utils/areaDetection';
import { makeFlooring } from '../flooring/catalog';
import type { PlannerPointerEvent } from '../contract/toolTypes';

const handlers = selectTool.handlers!;
const AREA = roomId(['v1', 'v2', 'v5', 'v6']);

function ev(partial: Partial<PlannerPointerEvent> & { clientX?: number; clientY?: number }): PlannerPointerEvent {
  const { clientX = partial.x ?? 0, clientY = partial.y ?? 0, ...rest } = partial;
  return {
    x: 0,
    y: 0,
    snappedX: 0,
    snappedY: 0,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    originalEvent: { button: 0, buttons: 1, clientX, clientY } as unknown as PlannerPointerEvent['originalEvent'],
    ...rest,
  };
}

const up = ev({ x: 0, y: 0 });
up.originalEvent = { button: 0, buttons: 0 } as unknown as PlannerPointerEvent['originalEvent'];

const flooringOf = () => getSelectedLayer(usePlannerStore.getState().scene).areas[AREA]?.flooring;

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().setAreaFlooring(AREA, makeFlooring('tile'));
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().clearSelection();
  usePlannerStore.getState().setMode('idle');
});

describe('selectTool — drag to reposition the floor layout', () => {
  it('shifts the pattern offset by the drag delta, as one undo step', () => {
    handlers.onPointerDown!(ev({ x: 300, y: 250, targetId: AREA, targetKind: 'areas' }));
    expect(usePlannerStore.getState().selected.areas).toContain(AREA);

    handlers.onPointerMove!(ev({ x: 340, y: 230 }));
    handlers.onPointerUp!(up);

    expect(flooringOf()).toMatchObject({ offsetX: 40, offsetY: -20 });
    // One undo step for the whole gesture; undo restores the original layout.
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(flooringOf()).toMatchObject({ offsetX: 0, offsetY: 0 });
  });

  it('accumulates from the current offset on a second drag', () => {
    usePlannerStore.getState().setAreaFlooring(AREA, makeFlooring('tile', { offsetX: 15, offsetY: 5 }));
    handlers.onPointerDown!(ev({ x: 300, y: 250, targetId: AREA, targetKind: 'areas' }));
    handlers.onPointerMove!(ev({ x: 310, y: 250 }));
    handlers.onPointerUp!(up);
    expect(flooringOf()).toMatchObject({ offsetX: 25, offsetY: 5 });
  });

  it('a click without moving selects the room but leaves the layout put', () => {
    handlers.onPointerDown!(ev({ x: 300, y: 250, targetId: AREA, targetKind: 'areas' }));
    handlers.onPointerUp!(up);
    expect(usePlannerStore.getState().selected.areas).toContain(AREA);
    expect(flooringOf()).toMatchObject({ offsetX: 0, offsetY: 0 });
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });

  it('does nothing when the room has no flooring', () => {
    usePlannerStore.getState().setAreaFlooring(AREA, undefined);
    usePlannerStore.getState().clearHistory();
    handlers.onPointerDown!(ev({ x: 300, y: 250, targetId: AREA, targetKind: 'areas' }));
    handlers.onPointerMove!(ev({ x: 340, y: 230 }));
    handlers.onPointerUp!(up);
    expect(flooringOf()).toBeUndefined();
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });
});
