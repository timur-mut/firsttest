// Select tool — owned by Unit 7 (Selection + properties).
// The default ('idle') tool. Handles:
//  • click an element to select it (shift to extend/toggle)
//  • click empty space to clear the selection
//  • drag a selected ITEM to move it (one undo step for the whole gesture)
//  • drag a selected WALL to translate it — both endpoints move, so adjacent
//    walls follow (one undo step for the whole gesture)

import { usePlannerStore } from '../store';
import { snapToGrid } from '../contract/snapping';
import { GRID_SIZE } from '../config';
import type { PlannerPointerEvent, ToolDescriptor } from '../contract/toolTypes';

/** Transient drag state for moving a selected item. Not part of the store. */
interface ItemDrag {
  itemId: string;
  /** Offset from the item center to the grab point, in world units. */
  dx: number;
  dy: number;
  /** True once history has been paused for this gesture. */
  paused: boolean;
}

/** Transient drag state for translating a selected wall. */
interface LineDrag {
  lineId: string;
  /** Last applied (grid-snapped when grid snapping is on) world point. */
  lastX: number;
  lastY: number;
  paused: boolean;
}

let drag: ItemDrag | null = null;
let lineDrag: LineDrag | null = null;

/** Snap a world coordinate to the grid when grid snapping is enabled. */
function gridPoint(x: number, y: number, gridOn: boolean): { x: number; y: number } {
  return gridOn ? { x: snapToGrid(x, GRID_SIZE), y: snapToGrid(y, GRID_SIZE) } : { x, y };
}

/** Resume history if a gesture had paused it, and clear all drag state. */
function endGesture() {
  const paused = drag?.paused || lineDrag?.paused;
  if (paused) usePlannerStore.getState().resumeHistory();
  drag = null;
  lineDrag = null;
}

export const selectTool: ToolDescriptor = {
  id: 'select',
  label: 'Select',
  icon: 'MousePointer2',
  mode: 'idle',
  shortcut: 'v',
  cursor: 'default',
  group: 'select',
  handlers: {
    onPointerDown(e: PlannerPointerEvent) {
      // Only react to the primary (left) button.
      if (e.originalEvent.button !== 0) return;
      const store = usePlannerStore.getState();

      if (e.targetId && e.targetKind) {
        store.select(e.targetKind, e.targetId, e.shiftKey);

        // Prepare to drag a single selected item. We compute the grab offset so
        // the item doesn't jump to the cursor on the first move.
        if (e.targetKind === 'items') {
          const layer = store.scene.layers[store.scene.selectedLayer];
          const item = layer.items[e.targetId];
          if (item) {
            // Offset is baselined on the SNAPPED grab point so it stays in the
            // same coordinate space as the snapped point used while moving
            // (below); otherwise the item jumps by (raw - snapped) on the first
            // move when snapping is active.
            drag = {
              itemId: e.targetId,
              dx: item.x - e.snappedX,
              dy: item.y - e.snappedY,
              paused: false,
            };
          }
        }

        // Prepare to translate a selected wall. Movement is incremental and
        // grid-aligned (grid snapping only — never snap a wall onto another
        // wall while dragging the body), so the wall keeps its shape and shifts
        // in clean grid steps.
        if (e.targetKind === 'lines') {
          const start = gridPoint(e.x, e.y, store.snapMask.grid);
          lineDrag = { lineId: e.targetId, lastX: start.x, lastY: start.y, paused: false };
        }
        return;
      }

      // Clicked empty canvas → clear selection.
      store.clearSelection();
    },

    onPointerMove(e: PlannerPointerEvent) {
      // Wall translation takes precedence if a wall drag is active.
      if (lineDrag) {
        if (e.originalEvent.buttons === 0) {
          endGesture();
          return;
        }
        const store = usePlannerStore.getState();
        const cur = gridPoint(e.x, e.y, store.snapMask.grid);
        const dx = cur.x - lineDrag.lastX;
        const dy = cur.y - lineDrag.lastY;
        if (dx !== 0 || dy !== 0) {
          if (!lineDrag.paused) {
            store.pauseHistory();
            lineDrag.paused = true;
          }
          store.moveLine(lineDrag.lineId, dx, dy);
          lineDrag.lastX = cur.x;
          lineDrag.lastY = cur.y;
        }
        return;
      }

      if (!drag) return;
      if (e.originalEvent.buttons === 0) {
        // Button released outside our up handler — end the gesture cleanly.
        endGesture();
        return;
      }
      const store = usePlannerStore.getState();
      if (!drag.paused) {
        store.pauseHistory();
        drag.paused = true;
      }
      store.moveItem(drag.itemId, e.snappedX + drag.dx, e.snappedY + drag.dy);
    },

    onPointerUp() {
      if (!drag && !lineDrag) return;
      endGesture();
    },

    onDeactivate() {
      // Drop any in-progress drag if the user switches tools mid-gesture.
      endGesture();
    },
  },
};
