// Toolbar — owned by Unit 10 (Toolbar & mode switching). Foundation ships a
// working vertical tool strip + undo/redo. Unit 10 polishes: snap-mask toggles,
// tooltips, group separators, active-mode affordances.

import { usePlannerStore } from '../store';
import { TOOLS } from '../tools/registry';
import { iconByName } from '../ui/icons';
import { cn } from '@/lib/utils';

export function Toolbar() {
  const mode = usePlannerStore((s) => s.mode);
  const setMode = usePlannerStore((s) => s.setMode);
  const past = usePlannerStore((s) => s.history.past.length);
  const future = usePlannerStore((s) => s.history.future.length);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);

  const Undo = iconByName('Undo2');
  const Redo = iconByName('Redo2');

  return (
    <div className="flex w-12 flex-col items-center gap-1 border-r bg-card py-2">
      {TOOLS.map((tool) => {
        const Icon = iconByName(tool.icon);
        const active = tool.mode === mode;
        return (
          <button
            key={tool.id}
            type="button"
            title={tool.shortcut ? `${tool.label} (${tool.shortcut.toUpperCase()})` : tool.label}
            aria-label={tool.label}
            aria-pressed={active}
            onClick={() => setMode(tool.mode)}
            className={cn(
              'inline-flex size-9 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}

      <div className="my-1 h-px w-6 bg-border" />

      <button
        type="button"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        disabled={past === 0}
        onClick={() => undo()}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Undo className="size-4" />
      </button>
      <button
        type="button"
        title="Redo (Ctrl+Shift+Z)"
        aria-label="Redo"
        disabled={future === 0}
        onClick={() => redo()}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Redo className="size-4" />
      </button>
    </div>
  );
}
