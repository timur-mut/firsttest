// Item (furniture) tool — Unit 6 (Furniture placement).
// Primary placement is drag-drop from the catalog (wired in the Viewport); this
// tool provides a click-to-place fallback that drops a default prototype at the
// snapped cursor position and selects it.

import type { ToolDescriptor } from '../contract/toolTypes';
import { usePlannerStore } from '../store';

/** Default prototype dropped by the click-to-place fallback. */
const DEFAULT_PROTOTYPE = {
  type: 'table',
  width: 120,
  depth: 80,
  color: '#a78bfa',
};

export const itemTool: ToolDescriptor = {
  id: 'furniture',
  label: 'Furniture',
  icon: 'Sofa',
  mode: 'placing-item',
  shortcut: 'f',
  cursor: 'copy',
  group: 'place',
  handlers: {
    onPointerDown(e) {
      // Left button only.
      if (e.originalEvent.button !== 0) return;
      e.originalEvent.stopPropagation();
      const store = usePlannerStore.getState();
      const id = store.addItem(DEFAULT_PROTOTYPE, e.snappedX, e.snappedY);
      // Select the freshly placed item (Unit 7 owns the selection behavior).
      store.select('items', id);
    },
  },
};
