// Catalog sidebar — Unit 5. A left panel with a search box and category
// sections of draggable furniture tiles. Dragging a tile sets the catalog ->
// canvas drag payload (ITEM_DRAG_MIME / ItemDragPayload); the frozen Viewport
// reads it on drop and places an Item.

import { useMemo, useState } from 'react';
import { PanelLeftClose, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePanelStore } from '@/planner/panels/panelStore';
import { Input } from '@/components/ui/input';
import {
  ITEM_DRAG_MIME,
  type ItemDragPayload,
  type ItemPrototype,
} from '@/planner/contract/catalogTypes';
import { iconByName } from '@/planner/ui/icons';
import { CATALOG, groupByCategory } from './data';

function handleDragStart(
  e: React.DragEvent<HTMLButtonElement>,
  proto: ItemPrototype,
) {
  const payload: ItemDragPayload = {
    type: proto.type,
    defaultWidth: proto.defaultWidth,
    defaultDepth: proto.defaultDepth,
    color: proto.color,
  };
  e.dataTransfer.setData(ITEM_DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'copy';
}

function CatalogTile({ proto }: { proto: ItemPrototype }) {
  const Icon = iconByName(proto.icon ?? 'Square');
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => handleDragStart(e, proto)}
      title={`${proto.name} — ${proto.defaultWidth}×${proto.defaultDepth} cm`}
      className={cn(
        'flex w-full cursor-grab items-center gap-2 rounded-md border border-border',
        'bg-background px-2 py-1.5 text-left text-sm',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
      )}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded border border-border"
        style={{ backgroundColor: proto.color }}
        aria-hidden
      >
        <Icon className="size-4 text-foreground/80" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium leading-tight">{proto.name}</span>
        <span className="text-xs text-muted-foreground">
          {proto.defaultWidth}×{proto.defaultDepth} cm
        </span>
      </span>
    </button>
  );
}

export function CatalogSidebar() {
  const [query, setQuery] = useState('');
  const open = usePanelStore((s) => s.catalogOpen);
  const setCatalog = usePanelStore((s) => s.setCatalog);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? CATALOG.filter((item) => item.name.toLowerCase().includes(q))
      : CATALOG;
    return groupByCategory(filtered);
  }, [query]);

  return (
    <aside
      className={cn(
        // Mobile: a slide-in drawer over the canvas.
        'absolute inset-y-0 left-0 z-30 flex w-64 flex-col overflow-hidden border-r bg-card shadow-xl transition-transform duration-200',
        open ? 'visible translate-x-0' : 'invisible -translate-x-full',
        // Desktop: docked column that collapses by width.
        'md:static md:z-auto md:shadow-none md:transition-[width] md:duration-200',
        open ? 'md:w-64' : 'md:w-0 md:border-r-0',
      )}
    >
      <div className="flex h-full w-64 shrink-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <span className="text-sm font-medium">Catalog</span>
          <button
            type="button"
            onClick={() => setCatalog(false)}
            aria-label="Collapse catalog panel"
            title="Collapse catalog"
            className="-mr-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>

        <div className="border-b p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search furniture"
            aria-label="Search furniture"
            className="h-8 pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <div className="px-1 py-6 text-center text-xs text-muted-foreground">
            No items match “{query}”.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <section key={group.category}>
                <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h3>
                <div className="flex flex-col gap-1">
                  {group.items.map((proto) => (
                    <CatalogTile key={proto.type} proto={proto} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        </div>
      </div>
    </aside>
  );
}
