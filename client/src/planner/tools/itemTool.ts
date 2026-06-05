// Item (furniture) tool — STUB owned by Unit 5 (Catalog + placement).
// Primary placement is drag-drop from the catalog; this tool provides a
// click-to-place fallback for the currently chosen prototype.

import type { ToolDescriptor } from '../contract/toolTypes';

export const itemTool: ToolDescriptor = {
  id: 'furniture',
  label: 'Furniture',
  icon: 'Sofa',
  mode: 'placing-item',
  shortcut: 'f',
  cursor: 'copy',
  group: 'place',
  // handlers: filled by Unit 5
};
