// Wall tool — STUB owned by Unit 2 (Wall drawing).
// Unit 2 adds handlers that call the wall slice (beginWall/addWallPoint/…) and
// use contract/snapping for vertex + angle snapping.

import type { ToolDescriptor } from '../contract/toolTypes';

export const wallTool: ToolDescriptor = {
  id: 'wall',
  label: 'Wall',
  icon: 'PenLine',
  mode: 'drawing-wall',
  shortcut: 'w',
  cursor: 'crosshair',
  group: 'draw',
  // handlers: filled by Unit 2
};
