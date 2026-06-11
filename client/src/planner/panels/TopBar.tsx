// Top bar — owned by Unit 11 (Project management). Provides the app title, an
// inline-editable project name, a "New" action, the File actions (Save downloads
// the scene as JSON, Open loads a JSON file) wired to the persistence module
// (Unit 9), zoom controls, and the theme switcher.

import { useEffect, useRef, useState } from 'react';
import { Cloud, FolderOpen, Minus, PanelLeft, PanelRight, Plus } from 'lucide-react';
import { usePlannerStore } from '../store';
import { usePanelStore } from './panelStore';
import { cn } from '@/lib/utils';
import { clamp, ZOOM_MAX, ZOOM_MIN } from '../config';
import { exportToFile, importFromFile } from '../persistence/storage';
import { savePlanToServer, updatePlanOnServer } from '../persistence/api';
import { referenceImageSnapshot, useReferenceImageStore } from '../store/referenceImageStore';
import { getCurrentPlanId, router } from '@/app/router';
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

  const catalogOpen = usePanelStore((s) => s.catalogOpen);
  const propertiesOpen = usePanelStore((s) => s.propertiesOpen);
  const toggleCatalog = usePanelStore((s) => s.toggleCatalog);
  const toggleProperties = usePanelStore((s) => s.toggleProperties);

  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [cloud, setCloud] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

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
    if (ok) {
      resetScene();
      useReferenceImageStore.getState().clear();
      // Drop any bound plan id from the URL so the next Cloud Save creates a new
      // plan instead of overwriting the one we were editing.
      void router.navigate({ to: '/editor' });
    }
  }

  // Save downloads the current scene as a JSON file.
  function onSave() {
    exportToFile(usePlannerStore.getState().scene);
  }

  // Save to the database: update the bound plan, or create a new one.
  async function onCloudSave() {
    const scene = usePlannerStore.getState().scene;
    const refImage = referenceImageSnapshot();
    const currentId = getCurrentPlanId();
    setCloud('saving');
    try {
      const saved = currentId
        ? await updatePlanOnServer(currentId, scene.name, scene, refImage)
        : await savePlanToServer(scene.name, scene, refImage);
      // Reflect the (possibly new) plan id in the URL so a reload reopens it.
      if (saved.id !== currentId) {
        void router.navigate({ to: '/editor/$planId', params: { planId: String(saved.id) } });
      }
      setCloud('saved');
      window.setTimeout(() => setCloud('idle'), 2000);
    } catch {
      setCloud('error');
      window.setTimeout(() => setCloud('idle'), 3000);
    }
  }

  const cloudLabel =
    cloud === 'saving' ? 'Saving…' : cloud === 'saved' ? 'Saved ✓' : cloud === 'error' ? 'Error' : 'Cloud Save';
  // Open picks a JSON file from disk and loads it into the scene.
  function onOpen() {
    fileInput.current?.click();
  }
  async function onOpenFile(e: React.ChangeEvent<HTMLInputElement>) {
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
    <header className="flex h-12 shrink-0 items-center gap-1 border-b bg-card px-1.5 sm:px-3">
      {/* Catalog toggle — anchored left, always visible. */}
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-8 shrink-0', catalogOpen && 'bg-accent text-accent-foreground')}
        aria-label="Toggle catalog panel"
        aria-pressed={catalogOpen}
        title="Toggle catalog panel"
        onClick={toggleCatalog}
      >
        <PanelLeft className="size-4" />
      </Button>

      {/* Scrollable middle: title, name, file/cloud actions. Scrolls on narrow
          screens so the anchored toggles + zoom stay reachable. */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        <span className="hidden shrink-0 font-semibold md:inline">Planner</span>

        {editing ? (
          <Input
            ref={nameInput}
            aria-label="Project name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={onNameKeyDown}
            className="h-7 w-40 shrink-0 text-sm sm:w-48"
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            title="Click to rename project"
            aria-label={`Project name: ${name}. Click to rename.`}
            className="max-w-32 shrink-0 truncate rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground sm:max-w-48"
          >
            {name}
          </button>
        )}

        <div className="flex shrink-0 items-center gap-1 sm:ml-2">
          <Button variant="outline" size="sm" onClick={() => void router.navigate({ to: '/' })}>
            <FolderOpen className="size-4" /> <span className="hidden sm:inline">Plans</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onCloudSave()}
            disabled={cloud === 'saving'}
            title="Save this plan to the database"
          >
            <Cloud className="size-4" /> <span className="hidden sm:inline">{cloudLabel}</span>
          </Button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <Button variant="ghost" size="sm" onClick={onNew}>New</Button>
          <Button variant="ghost" size="sm" onClick={onSave}>Save</Button>
          <Button variant="ghost" size="sm" onClick={onOpen}>Open</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onOpenFile}
          />
        </div>
      </div>

      {/* Right cluster — anchored, always visible: zoom, theme, properties toggle. */}
      <div className="flex shrink-0 items-center gap-1">
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
        {/* System theme still applies on mobile, so hide the switcher there. */}
        <div className="ml-1 hidden sm:block">
          <ThemeSwitcher />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-8', propertiesOpen && 'bg-accent text-accent-foreground')}
          aria-label="Toggle properties panel"
          aria-pressed={propertiesOpen}
          title="Toggle properties panel"
          onClick={toggleProperties}
        >
          <PanelRight className="size-4" />
        </Button>
      </div>
    </header>
  );
}
