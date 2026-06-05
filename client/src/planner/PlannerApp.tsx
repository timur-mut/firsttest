// ─────────────────────────────────────────────────────────────────────────────
// PlannerApp — top-level layout. Foundation-owned, frozen.
//
//   ┌──────────────────────── TopBar ────────────────────────┐
//   │ Toolbar │ CatalogSidebar │   Viewport   │   Sidebar     │
//   └─────────────────────────────────────────────────────────┘
//
// Installs global keyboard shortcuts and composes the panels. Workers fill in
// the panels/layers/tools; this file is not edited by them.
// ─────────────────────────────────────────────────────────────────────────────

import { usePlannerShortcuts } from './shortcuts/keymap';
import { TopBar } from './panels/TopBar';
import { Toolbar } from './panels/Toolbar';
import { CatalogSidebar } from './catalog/CatalogSidebar';
import { Sidebar } from './panels/Sidebar';
import { Viewport } from './render/Viewport';

export function PlannerApp() {
  usePlannerShortcuts();
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Toolbar />
        <CatalogSidebar />
        <Viewport />
        <Sidebar />
      </div>
    </div>
  );
}
