// Right sidebar — layout shell. Hosts the properties panel. Collapsible: a
// docked column on desktop (collapses by width) and a slide-in drawer over the
// canvas on mobile. Visibility is driven by the shared panel store.

import { cn } from '@/lib/utils';
import { PropertiesPanel } from './PropertiesPanel';
import { ReferenceImagePanel } from './ReferenceImagePanel';
import { usePanelStore } from './panelStore';

export function Sidebar() {
  const open = usePanelStore((s) => s.propertiesOpen);
  const setProperties = usePanelStore((s) => s.setProperties);

  return (
    <aside
      className={cn(
        // Mobile: a slide-in drawer over the canvas.
        'absolute inset-y-0 right-0 z-30 flex w-72 flex-col overflow-hidden border-l bg-card shadow-xl transition-transform duration-200',
        open ? 'visible translate-x-0' : 'invisible translate-x-full',
        // Desktop: docked column that collapses by width.
        'md:static md:z-auto md:shadow-none md:translate-x-0 md:transition-[width] md:duration-200',
        open ? 'md:w-72' : 'md:w-0 md:border-l-0',
      )}
    >
      <div className="flex h-full w-72 shrink-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <PropertiesPanel onClose={() => setProperties(false)} />
        </div>
        <ReferenceImagePanel />
      </div>
    </aside>
  );
}
