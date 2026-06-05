// Top bar — owned by Unit 11 (Project management). Provides the app title, an
// inline-editable project name, a "New" action, the File actions (Save / Open /
// Export / Import) wired to the persistence module (Unit 9), zoom controls, and
// the theme switcher. The File-action API and store action signatures are frozen.

import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { usePlannerStore } from '../store';
import { clamp, ZOOM_MAX, ZOOM_MIN } from '../config';
import { exportToFile, importFromFile, loadFromLocal, saveToLocal } from '../persistence/storage';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TopBar() {
  const name = usePlannerStore((s) => s.scene.name);
  const zoom = usePlannerStore((s) => s.zoom);
  const resetView = usePlannerStore((s) => s.resetView);
  const setZoom = usePlannerStore((s) => s.setZoom);
  const renameProject = usePlannerStore((s) => s.renameProject);
  const resetScene = usePlannerStore((s) => s.resetScene);

  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  // Keep the draft in sync when the underlying name changes (load/import/new)
  // and we're not actively editing.
  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  // Focus + select the field when entering edit mode.
  useEffect(() => {
    if (editing) {
      nameInput.current?.focus();
      nameInput.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(name);
    setEditing(true);
  }

  function commitName() {
    const next = draft.trim();
    if (next && next !== name) renameProject(next);
    setEditing(false);
  }

  function cancelName() {
    setDraft(name);
    setEditing(false);
  }

  function onNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelName();
    }
  }

  function onNew() {
    const ok = window.confirm('Start a new blank project? Unsaved changes will be lost.');
    if (ok) resetScene();
  }

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

  function zoomBy(factor: number) {
    setZoom(clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX));
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-card px-3">
      <span className="font-semibold">Planner</span>

      {editing ? (
        <Input
          ref={nameInput}
          aria-label="Project name"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={onNameKeyDown}
          className="h-7 w-48 text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          title="Click to rename project"
          aria-label={`Project name: ${name}. Click to rename.`}
          className="max-w-48 truncate rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {name}
        </button>
      )}

      <div className="ml-4 flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onNew}>New</Button>
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

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Zoom out"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => zoomBy(1 / 1.2)}
        >
          <Minus />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-w-14"
          aria-label="Reset zoom"
          title="Reset view"
          onClick={resetView}
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Zoom in"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => zoomBy(1.2)}
        >
          <Plus />
        </Button>
        <div className="ml-1">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
