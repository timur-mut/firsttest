// ─────────────────────────────────────────────────────────────────────────────
// Catalog contract — shared by the catalog sidebar and drag-drop placement
// (both Unit 5). Foundation-owned, frozen.
// ─────────────────────────────────────────────────────────────────────────────

export type CatalogCategory =
  | 'seating'
  | 'tables'
  | 'beds'
  | 'storage'
  | 'kitchen'
  | 'bathroom'
  | 'decor';

/** A furniture blueprint shown in the catalog and instantiated as an `Item`. */
export interface ItemPrototype {
  /** Stable type key stored on placed items (Item.type). */
  type: string;
  name: string;
  category: CatalogCategory;
  /** Default footprint in world units. */
  defaultWidth: number;
  defaultDepth: number;
  /** Default fill color for the 2D footprint. */
  color: string;
  /** Optional lucide-react icon name for the catalog tile. */
  icon?: string;
}

/** MIME type used for the catalog -> canvas drag payload. */
export const ITEM_DRAG_MIME = 'application/x-planner-item';

/** Payload carried in dataTransfer when dragging a catalog tile. */
export interface ItemDragPayload {
  type: string;
  defaultWidth: number;
  defaultDepth: number;
  color: string;
}
