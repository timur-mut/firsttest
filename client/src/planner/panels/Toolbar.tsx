// Toolbar — owned by Unit 10 (Toolbar & mode switching). Foundation ships a
// working vertical tool strip; Unit 10 polishes: snap-mask toggles, tooltips,
// group separators, active-mode affordances.

import { usePlannerStore } from '../store';
import { TOOLS } from '../tools/registry';
import { iconByName } from '../ui/icons';
import { cn } from '@/lib/utils';

export function Toolbar() {
  const mode = usePlannerStore((s) => s.mode);
  const setMode = usePlannerStore((s) => s.setMode);

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
    </div>
  );
}
