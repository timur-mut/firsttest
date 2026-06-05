// Select tool — STUB owned by Unit 6 (Selection + properties).
// The descriptor is real so the toolbar/shortcuts work; Unit 6 adds handlers
// (click select, marquee, drag to move, rotate handles).

import type { ToolDescriptor } from '../contract/toolTypes';

export const selectTool: ToolDescriptor = {
  id: 'select',
  label: 'Select',
  icon: 'MousePointer2',
  mode: 'idle',
  shortcut: 'v',
  cursor: 'default',
  group: 'select',
  // handlers: filled by Unit 6
};
