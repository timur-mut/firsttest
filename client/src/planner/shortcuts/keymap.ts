// ─────────────────────────────────────────────────────────────────────────────
// Global keyboard shortcuts — FROZEN aggregator. Foundation-owned.
//
// Wires undo/redo (already on the store), Escape (cancel/deselect), Delete
// (remove selection), and per-tool shortcuts pulled from the registry. Tool
// shortcuts come from each ToolDescriptor, so adding a tool needs no edit here.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { usePlannerStore } from '../store';
import { TOOLS, toolForMode, toolForShortcut } from '../tools/registry';

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

/** Install global planner shortcuts for the lifetime of the component. */
export function usePlannerShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      const store = usePlannerStore.getState();
      const mod = e.ctrlKey || e.metaKey;

      // Undo / redo.
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        store.redo();
        return;
      }

      // Escape: drop any draft, return to idle, clear selection.
      if (e.key === 'Escape') {
        toolForMode(store.mode)?.handlers?.onDeactivate?.();
        store.setMode('idle');
        store.clearSelection();
        return;
      }

      // Delete current selection.
      if (e.key === 'Delete' || e.key === 'Backspace') {
        store.deleteSelected();
        return;
      }

      // Tool shortcuts (single key, no modifier).
      if (!mod && !e.altKey) {
        const tool = toolForShortcut(e.key.toLowerCase());
        if (tool) {
          toolForMode(store.mode)?.handlers?.onDeactivate?.();
          store.setMode(tool.mode);
          return;
        }
      }

      // Forward unhandled keys to the active tool.
      toolForMode(store.mode)?.handlers?.onKeyDown?.(e);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // TOOLS is module-constant; listed to document the dependency.
  }, []);
}

export { TOOLS };
