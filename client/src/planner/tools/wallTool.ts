// Wall tool — owned by Unit 2 (Wall drawing).
// Handlers drive the wall slice (beginWall/addWallPoint/…) and use the
// foundation snapping (snapped coords) plus angle snapping when Shift is held.

import type { PlannerPointerEvent, ToolDescriptor } from '../contract/toolTypes';
import { angleDegrees, snapAngle, distance } from '../contract/geometry';
import { ANGLE_SNAP_STEP } from '../config';
import { usePlannerStore } from '../store';

/**
 * Resolve the world point to place next. Starts from the event's snapped
 * coordinates; when Shift is held and a previous chain point exists, the new
 * segment angle is additionally snapped relative to that point.
 */
function resolvePoint(e: PlannerPointerEvent): { x: number; y: number } {
  const store = usePlannerStore.getState();
  let x = e.snappedX;
  let y = e.snappedY;

  if (e.shiftKey && store.wallDraft && store.wallDraft.vertices.length > 0) {
    const layer = store.scene.layers[store.scene.selectedLayer];
    const prevId = store.wallDraft.vertices[store.wallDraft.vertices.length - 1];
    const prev = layer.vertices[prevId];
    if (prev) {
      const len = distance(prev.x, prev.y, x, y);
      const snappedDeg = snapAngle(angleDegrees(prev, { x, y }), ANGLE_SNAP_STEP);
      const rad = (snappedDeg * Math.PI) / 180;
      x = prev.x + Math.cos(rad) * len;
      y = prev.y + Math.sin(rad) * len;
    }
  }
  return { x, y };
}

export const wallTool: ToolDescriptor = {
  id: 'wall',
  label: 'Wall',
  icon: 'PenLine',
  mode: 'drawing-wall',
  shortcut: 'w',
  cursor: 'crosshair',
  group: 'draw',
  handlers: {
    onPointerDown(e) {
      if (e.originalEvent.button !== 0) return;
      const store = usePlannerStore.getState();
      const { x, y } = resolvePoint(e);

      if (!store.wallDraft) {
        store.beginWall(x, y);
        return;
      }

      // Double-click (or click on the last placed point) finishes the chain.
      if (e.originalEvent.detail >= 2) {
        store.finishWall();
        return;
      }
      store.addWallPoint(x, y);
    },

    onPointerMove(e) {
      const store = usePlannerStore.getState();
      if (!store.wallDraft) return;
      const { x, y } = resolvePoint(e);
      store.updateWallDraft(x, y);
    },

    onKeyDown(e) {
      const store = usePlannerStore.getState();
      if (!store.wallDraft) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        store.finishWall();
      }
    },

    onDeactivate() {
      usePlannerStore.getState().cancelWall();
    },
  },
};
