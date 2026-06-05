// Top bar — owned by Unit 11 (Project management). Foundation ships a working
// bar (title, project name, zoom readout, reset view, theme). Unit 11 adds
// new/rename project, import/export hooks, and refined zoom controls.

import { usePlannerStore } from '../store';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const name = usePlannerStore((s) => s.scene.name);
  const zoom = usePlannerStore((s) => s.zoom);
  const resetView = usePlannerStore((s) => s.resetView);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3">
      <span className="font-semibold">Planner</span>
      <span className="text-sm text-muted-foreground">{name}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={resetView}>
          {Math.round(zoom * 100)}%
        </Button>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
