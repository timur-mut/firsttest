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
import { usePanelStore } from './panels/panelStore';

export function PlannerApp() {
  usePlannerShortcuts();
  const drawerOpen = usePanelStore((s) => s.catalogOpen || s.propertiesOpen);
  const closeAll = usePanelStore((s) => s.closeAll);
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar />
      {/* `relative` anchors the mobile drawer panels + backdrop to the work area
          (below the top bar). On desktop the panels dock in normal flow. */}
      <div className="relative flex min-h-0 flex-1">
        <Toolbar />
        <CatalogSidebar />
        <Viewport />
        <Sidebar />
        {/* Mobile-only dimmer shown while a drawer panel is open; tap to close. */}
        {drawerOpen && (
          <button
            type="button"
            aria-label="Close panels"
            onClick={closeAll}
            className="absolute inset-0 z-20 bg-black/40 md:hidden"
          />
        )}
      </div>
    </div>
  );
}
