// ─────────────────────────────────────────────────────────────────────────────
// Tool registry — FROZEN aggregator. Foundation-owned.
//
// Imports each tool descriptor from its own file and exposes lookup helpers.
// The toolbar renders TOOLS; the Viewport dispatches pointer events to
// toolForMode(mode). Workers edit their own tool file, never this one.
// ─────────────────────────────────────────────────────────────────────────────

import type { Mode } from '../contract/types';
import type { ToolDescriptor } from '../contract/toolTypes';
import { selectTool } from './selectTool';
import { panTool } from './panTool';
import { wallTool } from './wallTool';
import { holeTool } from './holeTool';
import { itemTool } from './itemTool';

/** All tools, in toolbar order. */
export const TOOLS: ToolDescriptor[] = [selectTool, panTool, wallTool, holeTool, itemTool];

/** The tool whose `mode` matches the current editor mode (if any). */
export function toolForMode(mode: Mode): ToolDescriptor | undefined {
  return TOOLS.find((t) => t.mode === mode);
}

/** The tool bound to a single-key shortcut (if any). */
export function toolForShortcut(key: string): ToolDescriptor | undefined {
  return TOOLS.find((t) => t.shortcut === key);
}
