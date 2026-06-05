// Pan (Hand) tool — drag anywhere to move the whole view.
//
// No handlers are needed: the Viewport already pans on a left-drag whenever the
// mode is 'panning' (it captures the gesture before dispatching to a tool). This
// descriptor just exposes the mode in the toolbar + a keyboard shortcut.

import type { ToolDescriptor } from '../contract/toolTypes';

export const panTool: ToolDescriptor = {
  id: 'pan',
  label: 'Pan',
  icon: 'Hand',
  mode: 'panning',
  shortcut: 'h',
  cursor: 'grab',
  group: 'select',
};
