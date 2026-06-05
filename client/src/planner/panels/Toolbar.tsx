// Toolbar — owned by Unit 10 (Toolbar & mode switching). Vertical left strip:
// tool buttons grouped by `group` with separators, active-mode affordances,
// accessible tooltips, undo/redo, and snap-mask toggles.

import type { ComponentType } from 'react';
import { usePlannerStore } from '../store';
import { TOOLS } from '../tools/registry';
import type { ToolDescriptor, ToolGroup } from '../contract/toolTypes';
import type { SnapMask } from '../contract/types';
import { iconByName } from '../ui/icons';
import { cn } from '@/lib/utils';

type IconProps = { className?: string; size?: number | string };

/** Stable visual order of tool groups in the strip. */
const GROUP_ORDER: ToolGroup[] = ['select', 'draw', 'place'];

/** Group tools by their `group`, preserving registry order within a group. */
function groupedTools(): ToolDescriptor[][] {
  const buckets = new Map<string, ToolDescriptor[]>();
  for (const tool of TOOLS) {
    const key = tool.group ?? '_';
    const bucket = buckets.get(key);
    if (bucket) bucket.push(tool);
    else buckets.set(key, [tool]);
  }
  // Emit known groups first (in GROUP_ORDER), then any ungrouped/extra buckets.
  const ordered: ToolDescriptor[][] = [];
  for (const group of GROUP_ORDER) {
    const bucket = buckets.get(group);
    if (bucket) {
      ordered.push(bucket);
      buckets.delete(group);
    }
  }
  for (const bucket of buckets.values()) ordered.push(bucket);
  return ordered;
}

/** Build the tooltip text "Label (SHORTCUT)" or just "Label". */
function tooltip(label: string, shortcut?: string): string {
  return shortcut ? `${label} (${shortcut.toUpperCase()})` : label;
}

interface SnapToggle {
  kind: keyof SnapMask;
  label: string;
  icon: string;
  shortcut?: string;
}

/** Snap-mask toggles exposed in the toolbar (guide snapping has no UI here). */
const SNAP_TOGGLES: SnapToggle[] = [
  { kind: 'grid', label: 'Snap to grid', icon: 'Grid3x3' },
  { kind: 'vertex', label: 'Snap to vertices', icon: 'Spline' },
  { kind: 'line', label: 'Snap to lines', icon: 'Magnet' },
];

const BTN_BASE =
  'inline-flex size-9 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]';

function Separator() {
  return <div className="my-1 h-px w-6 bg-border" aria-hidden="true" />;
}

export function Toolbar() {
  const mode = usePlannerStore((s) => s.mode);
  const snapMask = usePlannerStore((s) => s.snapMask);
  const past = usePlannerStore((s) => s.history.past.length);
  const future = usePlannerStore((s) => s.history.future.length);
  const setMode = usePlannerStore((s) => s.setMode);
  const toggleSnap = usePlannerStore((s) => s.toggleSnap);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);

  const Undo = iconByName('Undo2');
  const Redo = iconByName('Redo2');

  const groups = groupedTools();

  return (
    <div className="flex w-12 flex-col items-center gap-1 border-r bg-card py-2">
      {groups.map((group, i) => (
        <div key={group[0]?.id ?? i} className="flex flex-col items-center gap-1">
          {i > 0 && <Separator />}
          {group.map((tool) => {
            const Icon: ComponentType<IconProps> = iconByName(tool.icon);
            const active = tool.mode === mode;
            return (
              <button
                key={tool.id}
                type="button"
                title={tooltip(tool.label, tool.shortcut)}
                aria-label={tool.label}
                aria-pressed={active}
                onClick={() => setMode(tool.mode)}
                className={cn(
                  BTN_BASE,
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      ))}

      <Separator />

      {/* Snap-mask toggles */}
      {SNAP_TOGGLES.map((snap) => {
        const Icon: ComponentType<IconProps> = iconByName(snap.icon);
        const on = snapMask[snap.kind];
        return (
          <button
            key={snap.kind}
            type="button"
            title={`${snap.label}: ${on ? 'on' : 'off'}`}
            aria-label={snap.label}
            aria-pressed={on}
            onClick={() => toggleSnap(snap.kind)}
            className={cn(
              BTN_BASE,
              on
                ? 'bg-primary/15 text-primary hover:bg-primary/25'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}

      <Separator />

      <button
        type="button"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        disabled={past === 0}
        onClick={() => undo()}
        className={cn(
          BTN_BASE,
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        <Undo className="size-4" />
      </button>
      <button
        type="button"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
        disabled={future === 0}
        onClick={() => redo()}
        className={cn(
          BTN_BASE,
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        <Redo className="size-4" />
      </button>
    </div>
  );
}
