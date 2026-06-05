// Tests drag-to-pan on empty canvas + the Hand/Pan tool registration.
import { describe, it, expect, beforeEach } from 'vitest';
import { selectTool } from './selectTool';
import { panTool } from './panTool';
import { TOOLS, toolForMode, toolForShortcut } from './registry';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import type { PlannerPointerEvent } from '../contract/toolTypes';

const handlers = selectTool.handlers!;

function ev(
  partial: Partial<PlannerPointerEvent>,
  oe: Partial<{ button: number; buttons: number; clientX: number; clientY: number }> = {},
): PlannerPointerEvent {
  return {
    x: 0,
    y: 0,
    snappedX: 0,
    snappedY: 0,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    originalEvent: { button: 0, buttons: 1, clientX: 0, clientY: 0, ...oe } as unknown as PlannerPointerEvent['originalEvent'],
    ...partial,
  };
}

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
  usePlannerStore.getState().clearSelection();
  usePlannerStore.getState().setMode('idle');
  usePlannerStore.getState().setPan(0, 0);
});

describe('drag empty canvas to pan the view', () => {
  it('pans by the drag delta and does not record undo history', () => {
    handlers.onPointerDown!(ev({}, { clientX: 200, clientY: 200 }));
    handlers.onPointerMove!(ev({}, { buttons: 1, clientX: 260, clientY: 230 }));

    expect(usePlannerStore.getState().pan).toMatchObject({ x: 60, y: 30 });
    expect(usePlannerStore.getState().history.past.length).toBe(0);

    handlers.onPointerUp!(ev({}, { buttons: 0 }));
  });

  it('treats a non-moving press as a click and clears the selection', () => {
    usePlannerStore.getState().select('items', 'i-sofa');
    expect(usePlannerStore.getState().selected.items).toContain('i-sofa');

    handlers.onPointerDown!(ev({}, { clientX: 100, clientY: 100 }));
    handlers.onPointerUp!(ev({}, { buttons: 0, clientX: 100, clientY: 100 }));

    expect(usePlannerStore.getState().selected.items).toHaveLength(0);
    // No accidental pan from a click.
    expect(usePlannerStore.getState().pan).toMatchObject({ x: 0, y: 0 });
  });

  it('ignores sub-threshold jitter (still a click, no pan)', () => {
    usePlannerStore.getState().select('items', 'i-sofa');
    handlers.onPointerDown!(ev({}, { clientX: 100, clientY: 100 }));
    handlers.onPointerMove!(ev({}, { buttons: 1, clientX: 101, clientY: 101 })); // ~1.4px < 3px
    handlers.onPointerUp!(ev({}, { buttons: 0, clientX: 101, clientY: 101 }));

    expect(usePlannerStore.getState().pan).toMatchObject({ x: 0, y: 0 });
    expect(usePlannerStore.getState().selected.items).toHaveLength(0);
  });
});

describe('Pan (Hand) tool', () => {
  it('is registered and resolvable by mode and shortcut', () => {
    expect(TOOLS).toContain(panTool);
    expect(panTool.mode).toBe('panning');
    expect(toolForMode('panning')).toBe(panTool);
    expect(toolForShortcut('h')).toBe(panTool);
  });
});
