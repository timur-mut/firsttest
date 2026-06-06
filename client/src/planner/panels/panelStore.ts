// Layout UI state for the editor's collapsible side panels (catalog on the left,
// properties on the right). Kept separate from the scene store so panel
// visibility is never part of undo/redo or persistence.
//
// Defaults: open on desktop, collapsed on mobile — so small screens start with a
// full-width canvas. On desktop the panels dock in flow and collapse by width;
// on mobile they become slide-in drawers over the canvas (see the panel
// components and PlannerApp's backdrop).
import { create } from 'zustand';

/** True when the viewport is at least the `md` breakpoint (768px). */
function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

interface PanelState {
  catalogOpen: boolean;
  propertiesOpen: boolean;
  toggleCatalog(): void;
  toggleProperties(): void;
  setCatalog(open: boolean): void;
  setProperties(open: boolean): void;
  /** Collapse both panels (used by the mobile backdrop). */
  closeAll(): void;
}

export const usePanelStore = create<PanelState>((set) => ({
  catalogOpen: isDesktop(),
  propertiesOpen: isDesktop(),
  toggleCatalog: () => set((s) => ({ catalogOpen: !s.catalogOpen })),
  toggleProperties: () => set((s) => ({ propertiesOpen: !s.propertiesOpen })),
  setCatalog: (open) => set({ catalogOpen: open }),
  setProperties: (open) => set({ propertiesOpen: open }),
  closeAll: () => set({ catalogOpen: false, propertiesOpen: false }),
}));
