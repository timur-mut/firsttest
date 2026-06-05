// Properties panel — STUB owned by Unit 6 (Selection + properties).
// Switches on the active selection bucket and renders editors for the selected
// element (wall thickness/height, hole size, item dimensions/rotation/color,
// area color), plus a delete action. Depends only on the contract + store.

import { usePlannerStore } from '../store';

export function PropertiesPanel() {
  const selected = usePlannerStore((s) => s.selected);
  const count =
    selected.vertices.length +
    selected.lines.length +
    selected.holes.length +
    selected.items.length +
    selected.areas.length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-3 py-2 text-sm font-medium">Properties</div>
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
        {count === 0 ? 'Nothing selected' : `${count} selected (editors: Unit 6)`}
      </div>
    </div>
  );
}
