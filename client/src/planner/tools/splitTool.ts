// Split / Add-corner tool — click a wall to break it by inserting a new vertex
// (corner) at that point. The new corner is selected and the tool returns to
// Select mode so it can be dragged immediately.

import { usePlannerStore } from '../store';
import type { PlannerPointerEvent, ToolDescriptor } from '../contract/toolTypes';

export const splitTool: ToolDescriptor = {
  id: 'split',
  label: 'Add corner',
  icon: 'Scissors',
  mode: 'splitting-wall',
  shortcut: 'c',
  cursor: 'crosshair',
  group: 'draw',
  handlers: {
    onPointerDown(e: PlannerPointerEvent) {
      if (e.originalEvent.button !== 0) return;
      if (e.targetKind !== 'lines' || !e.targetId) return;
      const store = usePlannerStore.getState();
      const vId = store.splitLine(e.targetId, e.x, e.y);
      if (vId) {
        // Select the new corner and return to Select so it can be dragged.
        store.select('vertices', vId);
        store.setMode('idle');
      }
    },
  },
};
