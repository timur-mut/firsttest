// ─────────────────────────────────────────────────────────────────────────────
// Tool contract — how interaction tools (select, wall, hole, item) describe
// themselves and receive pointer/keyboard input. Foundation-owned, frozen.
//
// Tools read/write state by importing the store singleton directly
// (`usePlannerStore.getState()`), so handlers take only the event — this keeps
// toolTypes.ts free of a circular import on the store.
// ─────────────────────────────────────────────────────────────────────────────

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Mode, PrototypeKind } from './types';

/** A pointer event already translated into world coordinates by the Viewport. */
export interface PlannerPointerEvent {
  /** Raw world coordinates under the cursor. */
  x: number;
  y: number;
  /** World coordinates after applying the active snap mask. */
  snappedX: number;
  snappedY: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  /** Scene element id directly under the pointer, if any. */
  targetId?: string;
  /** Kind of the element under the pointer, if any. */
  targetKind?: PrototypeKind;
  /** Underlying React event, for stopPropagation / button checks. */
  originalEvent: ReactPointerEvent;
}

/** Optional pointer/keyboard handlers a tool can implement. */
export interface ToolHandlers {
  onPointerDown?(e: PlannerPointerEvent): void;
  onPointerMove?(e: PlannerPointerEvent): void;
  onPointerUp?(e: PlannerPointerEvent): void;
  onKeyDown?(e: KeyboardEvent): void;
  /** Called when switching away from this tool — drop any in-progress draft. */
  onDeactivate?(): void;
}

/** Toolbar grouping for visual separators. */
export type ToolGroup = 'select' | 'draw' | 'place';

/**
 * Describes one tool: its toolbar appearance, the mode it activates, an
 * optional keyboard shortcut, and its interaction handlers. Each tool unit
 * exports one of these from its own file; the registry aggregates them.
 */
export interface ToolDescriptor {
  id: string;
  label: string;
  /** lucide-react icon name, e.g. 'MousePointer2'. */
  icon: string;
  /** Mode this tool puts the editor into when selected. */
  mode: Mode;
  /** Single-key shortcut (lowercase), e.g. 'w'. */
  shortcut?: string;
  /** CSS cursor while the tool is active. */
  cursor?: string;
  group?: ToolGroup;
  handlers?: ToolHandlers;
}
