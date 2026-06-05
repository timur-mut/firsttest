// Right sidebar — layout shell. Foundation-owned. Hosts the properties panel
// (Unit 6 fills the panel itself; this container is frozen).

import { PropertiesPanel } from './PropertiesPanel';

export function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-l bg-card">
      <PropertiesPanel />
    </aside>
  );
}
