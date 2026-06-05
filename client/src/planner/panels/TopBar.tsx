// Top bar — owned by Unit 11 (Project management). Foundation ships a working
// bar: project name, zoom readout/reset, theme, and File actions (Save / Open /
// Export / Import) wired to the persistence module (Unit 9). Unit 11 adds
// new/rename project and refines layout; it MUST keep the File actions working
// (persistence internals are Unit 9's; the API here is frozen).

import { useRef } from 'react';
import { usePlannerStore } from '../store';
import { exportToFile, importFromFile, loadFromLocal, saveToLocal } from '../persistence/storage';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const name = usePlannerStore((s) => s.scene.name);
  const zoom = usePlannerStore((s) => s.zoom);
  const resetView = usePlannerStore((s) => s.resetView);
  const fileInput = useRef<HTMLInputElement>(null);

  function onSave() {
    saveToLocal(usePlannerStore.getState().scene);
  }
  function onOpen() {
    const scene = loadFromLocal();
    if (scene) usePlannerStore.getState().setScene(scene);
  }
  function onExport() {
    exportToFile(usePlannerStore.getState().scene);
  }
  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const scene = await importFromFile(file);
      usePlannerStore.getState().setScene(scene);
    } catch {
      // Unit 9: surface a toast on invalid files.
    } finally {
      e.target.value = '';
    }
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3">
      <span className="font-semibold">Planner</span>
      <span className="text-sm text-muted-foreground">{name}</span>

      <div className="ml-4 flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onSave}>Save</Button>
        <Button variant="ghost" size="sm" onClick={onOpen}>Open</Button>
        <Button variant="ghost" size="sm" onClick={onExport}>Export</Button>
        <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>Import</Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImportFile}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={resetView}>
          {Math.round(zoom * 100)}%
        </Button>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
