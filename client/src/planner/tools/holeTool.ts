// Hole tool — owned by Unit 3 (Doors & windows).
// Places a hole on a wall by clicking it (line snap via segment projection),
// then lets the user slide it along the wall while the pointer is held down.

import type { HoleType } from '../contract/types';
import type { PlannerPointerEvent, ToolDescriptor } from '../contract/toolTypes';
import { projectPointOnSegment } from '../contract/geometry';
import { usePlannerStore } from '../store';
import { getSelectedLayer } from '../store/helpers';

// Module-level toggle for the kind of hole the next click places. The
// properties/toolbar UI can flip this; placement defaults to a door.
let desiredType: HoleType = 'door';

export function setHoleType(type: HoleType): void {
  desiredType = type;
}

export function getHoleType(): HoleType {
  return desiredType;
}

// The hole currently being dragged (placed on pointer-down, slid on move).
let activeHoleId: string | null = null;
// The wall the active hole lives on, so drag projection stays on that line.
let activeLineId: string | null = null;

/** Project a world point onto a line and return the fractional offset t. */
function offsetOnLine(lineId: string, x: number, y: number): number | null {
  const layer = getSelectedLayer(usePlannerStore.getState().scene);
  const line = layer.lines[lineId];
  if (!line) return null;
  const a = layer.vertices[line.vertices[0]];
  const b = layer.vertices[line.vertices[1]];
  if (!a || !b) return null;
  return projectPointOnSegment({ x, y }, a, b).t;
}

export const holeTool: ToolDescriptor = {
  id: 'hole',
  label: 'Door / Window',
  icon: 'DoorOpen',
  mode: 'drawing-hole',
  shortcut: 'd',
  cursor: 'copy',
  group: 'draw',
  handlers: {
    onPointerDown: (e: PlannerPointerEvent) => {
      if (e.targetKind !== 'lines' || !e.targetId) return;
      const lineId = e.targetId;
      const t = offsetOnLine(lineId, e.x, e.y);
      if (t === null) return;

      const store = usePlannerStore.getState();
      // Coalesce place + slide into a single undo step (resumed on pointer up).
      store.pauseHistory();
      // Snapshot existing hole ids so we can find the one we just created.
      const before = new Set(Object.keys(getSelectedLayer(store.scene).holes));
      store.addHole(lineId, desiredType, t);
      const after = Object.keys(getSelectedLayer(usePlannerStore.getState().scene).holes);
      const newId = after.find((id) => !before.has(id)) ?? null;

      activeHoleId = newId;
      activeLineId = lineId;
    },

    onPointerMove: (e: PlannerPointerEvent) => {
      if (!activeHoleId || !activeLineId) return;
      const t = offsetOnLine(activeLineId, e.x, e.y);
      if (t === null) return;
      usePlannerStore.getState().moveHole(activeHoleId, t);
    },

    onPointerUp: () => {
      usePlannerStore.getState().resumeHistory();
      activeHoleId = null;
      activeLineId = null;
    },

    onDeactivate: () => {
      usePlannerStore.getState().resumeHistory();
      activeHoleId = null;
      activeLineId = null;
    },
  },
};
