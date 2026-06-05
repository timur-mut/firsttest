// Select tool — owned by Unit 7 (Selection + properties).
// The default ('idle') tool. Handles:
//  • click an element to select it (shift to extend/toggle)
//  • click empty space to clear the selection
//  • drag a selected ITEM to move it (one undo step for the whole gesture)

import { usePlannerStore } from '../store';
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

let drag: ItemDrag | null = null;

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
        return;
      }

      // Clicked empty canvas → clear selection.
      store.clearSelection();
    },

    onPointerMove(e: PlannerPointerEvent) {
      if (!drag) return;
      if (e.originalEvent.buttons === 0) {
        // Button released outside our up handler — end the gesture cleanly.
        if (drag.paused) usePlannerStore.getState().resumeHistory();
        drag = null;
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
      if (!drag) return;
      if (drag.paused) usePlannerStore.getState().resumeHistory();
      drag = null;
    },

    onDeactivate() {
      // Drop any in-progress drag if the user switches tools mid-gesture.
      if (drag?.paused) usePlannerStore.getState().resumeHistory();
      drag = null;
    },
  },
};
