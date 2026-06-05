// Catalog sidebar — STUB owned by Unit 5 (Furniture catalog + placement).
// Renders categorized, searchable furniture tiles that can be dragged onto the
// canvas (dataTransfer payload = ItemDragPayload, MIME = ITEM_DRAG_MIME).

export function CatalogSidebar() {
  return (
    <aside className="flex w-56 flex-col border-r bg-card">
      <div className="border-b px-3 py-2 text-sm font-medium">Catalog</div>
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
        Furniture catalog (Unit 5)
      </div>
    </aside>
  );
}
