// Hole tool — STUB owned by Unit 3 (Doors & windows).
// Unit 3 adds handlers that place a hole on the nearest wall (line snap) and
// let the user slide it along the wall before committing.

import type { ToolDescriptor } from '../contract/toolTypes';

export const holeTool: ToolDescriptor = {
  id: 'hole',
  label: 'Door / Window',
  icon: 'DoorOpen',
  mode: 'drawing-hole',
  shortcut: 'd',
  cursor: 'copy',
  group: 'draw',
  // handlers: filled by Unit 3
};
