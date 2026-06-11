// Select tool — owned by Unit 7 (Selection + properties).
// The default ('idle') tool. Handles:
//  • click an element to select it (shift to extend/toggle)
//  • click empty space to clear the selection
//  • drag a selected ITEM to move it (one undo step for the whole gesture)
//  • drag a selected WALL to translate it — both endpoints move, so adjacent
//    walls follow (one undo step for the whole gesture)
//  • drag a CORNER (vertex) to move it — every wall attached to it follows
//    (one undo step for the whole gesture)
//  • drag a selected item's ROTATE handle to rotate it about its centre
//    (Shift snaps to 15°; one undo step for the whole gesture)
//  • drag a selected item's CORNER handle to RESIZE it (symmetric about the
//    centre; one undo step for the whole gesture)
//  • drag a selected DOOR/WINDOW to slide it along its wall
//  • drag empty canvas to PAN the whole view (a plain click still clears the
//    selection); view changes are not undoable

import { usePlannerStore } from '../store';
import { snapToGrid } from '../contract/snapping';
import { projectPointOnSegment } from '../contract/geometry';
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

/** Transient drag state for moving a selected corner (vertex). */
interface VertexDrag {
  vertexId: string;
  /** Offset from the vertex to the grab point, in world units. */
  dx: number;
  dy: number;
  paused: boolean;
}

/** Transient drag state for rotating a selected item via its rotate handle. */
interface RotationDrag {
  itemId: string;
  paused: boolean;
}

/** Transient drag state for resizing a selected item via a corner handle. */
interface ResizeDrag {
  itemId: string;
  paused: boolean;
}

/** Transient drag state for sliding a selected door/window along its wall. */
interface HoleDrag {
  holeId: string;
  paused: boolean;
}

/** Transient drag state for repositioning a room's floor layout. */
interface FloorDrag {
  areaId: string;
  /** Grab point in world units, and the pattern offset at grab time. */
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
  /** Screen-space grab point, to apply a small move threshold. */
  clientX: number;
  clientY: number;
  moved: boolean;
  paused: boolean;
}

/**
 * Drag-to-pan on empty canvas (left button). Screen-space; not undoable. A
 * gesture that never crosses the move threshold is treated as a click and
 * clears the selection instead of panning.
 */
interface CanvasPan {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
}

let drag: ItemDrag | null = null;
let lineDrag: LineDrag | null = null;
let vertexDrag: VertexDrag | null = null;
let rotationDrag: RotationDrag | null = null;
let resizeDrag: ResizeDrag | null = null;
let holeDrag: HoleDrag | null = null;
let floorDrag: FloorDrag | null = null;
let canvasPan: CanvasPan | null = null;

/** Movement (px) before an empty-canvas drag becomes a pan rather than a click. */
const PAN_THRESHOLD_PX = 3;

const ROTATE_SNAP_DEG = 15;

/** Minimum item width/depth when resizing (world units). */
const MIN_ITEM_SIZE = 10;

/** Normalize an angle to [0, 360). */
function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Snap a world coordinate to the grid when grid snapping is enabled. */
function gridPoint(x: number, y: number, gridOn: boolean): { x: number; y: number } {
  return gridOn ? { x: snapToGrid(x, GRID_SIZE), y: snapToGrid(y, GRID_SIZE) } : { x, y };
}

/** Resume history if a gesture had paused it, and clear all drag state. */
function endGesture() {
  const paused =
    drag?.paused ||
    lineDrag?.paused ||
    vertexDrag?.paused ||
    rotationDrag?.paused ||
    resizeDrag?.paused ||
    holeDrag?.paused ||
    floorDrag?.paused;
  if (paused) usePlannerStore.getState().resumeHistory();
  drag = null;
  lineDrag = null;
  vertexDrag = null;
  rotationDrag = null;
  resizeDrag = null;
  holeDrag = null;
  floorDrag = null;
  canvasPan = null;
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
        // Grabbing the rotate handle starts a rotation gesture (not a move).
        // Keep the item selected and ignore Shift here, so Shift-to-snap during
        // rotation doesn't toggle the selection off.
        if (e.handle === 'rotate' && e.targetKind === 'items') {
          store.select('items', e.targetId, false);
          rotationDrag = { itemId: e.targetId, paused: false };
          return;
        }

        // Grabbing a corner handle resizes the item (keep it selected).
        if (e.handle === 'resize' && e.targetKind === 'items') {
          store.select('items', e.targetId, false);
          resizeDrag = { itemId: e.targetId, paused: false };
          return;
        }

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

        // Prepare to drag a corner. We grab by absolute position (grid-aligned)
        // and record the grab offset so the corner doesn't jump to the cursor.
        if (e.targetKind === 'vertices') {
          const layer = store.scene.layers[store.scene.selectedLayer];
          const v = layer.vertices[e.targetId];
          if (v) {
            vertexDrag = { vertexId: e.targetId, dx: v.x - e.x, dy: v.y - e.y, paused: false };
          }
        }

        // Prepare to slide a selected door/window along its wall.
        if (e.targetKind === 'holes') {
          holeDrag = { holeId: e.targetId, paused: false };
        }

        // Prepare to drag-reposition a room's floor layout. Only rooms that
        // already have a floor covering are draggable; a plain click still just
        // selects (the move threshold keeps clicks from nudging the pattern).
        if (e.targetKind === 'areas') {
          const layer = store.scene.layers[store.scene.selectedLayer];
          const flooring = layer.areas[e.targetId]?.flooring;
          if (flooring) {
            floorDrag = {
              areaId: e.targetId,
              startX: e.x,
              startY: e.y,
              startOffsetX: flooring.offsetX ?? 0,
              startOffsetY: flooring.offsetY ?? 0,
              clientX: e.originalEvent.clientX,
              clientY: e.originalEvent.clientY,
              moved: false,
              paused: false,
            };
          }
        }
        return;
      }

      // Empty canvas: begin a pan-or-clear gesture. We pan if the pointer moves
      // past the threshold, otherwise treat it as a click and clear on up.
      canvasPan = {
        startX: e.originalEvent.clientX,
        startY: e.originalEvent.clientY,
        lastX: e.originalEvent.clientX,
        lastY: e.originalEvent.clientY,
        moved: false,
      };
    },

    onPointerMove(e: PlannerPointerEvent) {
      // Pan the whole view when dragging empty canvas.
      if (canvasPan) {
        if (e.originalEvent.buttons === 0) {
          canvasPan = null;
          return;
        }
        const { clientX, clientY } = e.originalEvent;
        if (
          !canvasPan.moved &&
          Math.hypot(clientX - canvasPan.startX, clientY - canvasPan.startY) < PAN_THRESHOLD_PX
        ) {
          return; // ignore sub-threshold jitter so a click still clears selection
        }
        canvasPan.moved = true;
        usePlannerStore.getState().panBy(clientX - canvasPan.lastX, clientY - canvasPan.lastY);
        canvasPan.lastX = clientX;
        canvasPan.lastY = clientY;
        return;
      }

      // Rotation takes precedence if a rotate gesture is active.
      if (rotationDrag) {
        if (e.originalEvent.buttons === 0) {
          endGesture();
          return;
        }
        const store = usePlannerStore.getState();
        const item = store.scene.layers[store.scene.selectedLayer].items[rotationDrag.itemId];
        if (item) {
          // The handle sits "up" (−Y) from the centre at rotation 0, so the
          // rotation is the cursor's angle about the centre plus 90°.
          let deg = norm360((Math.atan2(e.y - item.y, e.x - item.x) * 180) / Math.PI + 90);
          if (e.shiftKey) deg = norm360(Math.round(deg / ROTATE_SNAP_DEG) * ROTATE_SNAP_DEG);
          if (deg !== item.rotation) {
            if (!rotationDrag.paused) {
              store.pauseHistory();
              rotationDrag.paused = true;
            }
            store.rotateItem(rotationDrag.itemId, deg);
          }
        }
        return;
      }

      // Resize an item via a corner handle — symmetric about its centre.
      if (resizeDrag) {
        if (e.originalEvent.buttons === 0) {
          endGesture();
          return;
        }
        const store = usePlannerStore.getState();
        const item = store.scene.layers[store.scene.selectedLayer].items[resizeDrag.itemId];
        if (item) {
          // Cursor in the item's local (un-rotated) frame, relative to centre.
          const rad = (item.rotation * Math.PI) / 180;
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          const dx = e.x - item.x;
          const dy = e.y - item.y;
          const lx = dx * c + dy * s;
          const ly = -dx * s + dy * c;
          const width = Math.max(MIN_ITEM_SIZE, Math.abs(lx) * 2);
          const depth = Math.max(MIN_ITEM_SIZE, Math.abs(ly) * 2);
          if (width !== item.width || depth !== item.depth) {
            if (!resizeDrag.paused) {
              store.pauseHistory();
              resizeDrag.paused = true;
            }
            store.updateItem(resizeDrag.itemId, { width, depth });
          }
        }
        return;
      }

      // Slide a door/window along its wall.
      if (holeDrag) {
        if (e.originalEvent.buttons === 0) {
          endGesture();
          return;
        }
        const store = usePlannerStore.getState();
        const layer = store.scene.layers[store.scene.selectedLayer];
        const hole = layer.holes[holeDrag.holeId];
        const line = hole ? layer.lines[hole.lineId] : undefined;
        if (hole && line) {
          const a = layer.vertices[line.vertices[0]];
          const b = layer.vertices[line.vertices[1]];
          if (a && b) {
            const { t } = projectPointOnSegment({ x: e.x, y: e.y }, a, b);
            if (!holeDrag.paused) {
              store.pauseHistory();
              holeDrag.paused = true;
            }
            store.moveHole(holeDrag.holeId, t);
          }
        }
        return;
      }

      // Corner drag takes precedence if a vertex drag is active.
      if (vertexDrag) {
        if (e.originalEvent.buttons === 0) {
          endGesture();
          return;
        }
        const store = usePlannerStore.getState();
        const target = gridPoint(e.x + vertexDrag.dx, e.y + vertexDrag.dy, store.snapMask.grid);
        const v = store.scene.layers[store.scene.selectedLayer].vertices[vertexDrag.vertexId];
        if (v && (v.x !== target.x || v.y !== target.y)) {
          if (!vertexDrag.paused) {
            store.pauseHistory();
            vertexDrag.paused = true;
          }
          store.moveVertex(vertexDrag.vertexId, target.x, target.y);
        }
        return;
      }

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

      // Reposition a room's floor layout (free movement, no grid snap).
      if (floorDrag) {
        if (e.originalEvent.buttons === 0) {
          endGesture();
          return;
        }
        if (
          !floorDrag.moved &&
          Math.hypot(
            e.originalEvent.clientX - floorDrag.clientX,
            e.originalEvent.clientY - floorDrag.clientY,
          ) < PAN_THRESHOLD_PX
        ) {
          return; // sub-threshold jitter: keep it a click, not a nudge
        }
        floorDrag.moved = true;
        const store = usePlannerStore.getState();
        const flooring = store.scene.layers[store.scene.selectedLayer].areas[floorDrag.areaId]
          ?.flooring;
        if (!flooring) return;
        const offsetX = floorDrag.startOffsetX + (e.x - floorDrag.startX);
        const offsetY = floorDrag.startOffsetY + (e.y - floorDrag.startY);
        if (!floorDrag.paused) {
          store.pauseHistory();
          floorDrag.paused = true;
        }
        store.setAreaFlooring(floorDrag.areaId, { ...flooring, offsetX, offsetY });
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
      // A non-moving empty-canvas gesture is a click → clear the selection.
      if (canvasPan) {
        if (!canvasPan.moved) usePlannerStore.getState().clearSelection();
        canvasPan = null;
        return;
      }
      if (
        !drag &&
        !lineDrag &&
        !vertexDrag &&
        !rotationDrag &&
        !resizeDrag &&
        !holeDrag &&
        !floorDrag
      )
        return;
      endGesture();
    },

    onDeactivate() {
      // Drop any in-progress drag if the user switches tools mid-gesture.
      endGesture();
    },
  },
};
