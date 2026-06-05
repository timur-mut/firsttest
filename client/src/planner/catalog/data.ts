// Furniture catalog data — Unit 5. A static set of furniture prototypes spanning
// every CatalogCategory. Dimensions are in centimeters; colors are the default
// 2D footprint fills; icons are lucide-react names resolved via iconByName.

import type {
  CatalogCategory,
  ItemPrototype,
} from '@/planner/contract/catalogTypes';

/** Display order + labels for the catalog category sections. */
export const CATEGORY_ORDER: CatalogCategory[] = [
  'seating',
  'tables',
  'beds',
  'storage',
  'kitchen',
  'bathroom',
  'decor',
];

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  seating: 'Seating',
  tables: 'Tables',
  beds: 'Beds',
  storage: 'Storage',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  decor: 'Decor',
};

/** The furniture catalog. Dimensions in cm. */
export const CATALOG: ItemPrototype[] = [
  // ── Seating ───────────────────────────────────────────────────────────────
  {
    type: 'sofa',
    name: 'Sofa',
    category: 'seating',
    defaultWidth: 200,
    defaultDepth: 90,
    color: '#8b9dc3',
    icon: 'Sofa',
  },
  {
    type: 'armchair',
    name: 'Armchair',
    category: 'seating',
    defaultWidth: 90,
    defaultDepth: 90,
    color: '#9db0d6',
    icon: 'Armchair',
  },
  {
    type: 'chair',
    name: 'Chair',
    category: 'seating',
    defaultWidth: 50,
    defaultDepth: 50,
    color: '#a8b8d8',
    icon: 'Armchair',
  },

  // ── Tables ────────────────────────────────────────────────────────────────
  {
    type: 'dining-table',
    name: 'Dining Table',
    category: 'tables',
    defaultWidth: 160,
    defaultDepth: 90,
    color: '#c2a878',
    icon: 'Table',
  },
  {
    type: 'coffee-table',
    name: 'Coffee Table',
    category: 'tables',
    defaultWidth: 110,
    defaultDepth: 60,
    color: '#cdb389',
    icon: 'Table',
  },
  {
    type: 'desk',
    name: 'Desk',
    category: 'tables',
    defaultWidth: 140,
    defaultDepth: 70,
    color: '#b89968',
    icon: 'Table',
  },

  // ── Beds ──────────────────────────────────────────────────────────────────
  {
    type: 'bed-single',
    name: 'Single Bed',
    category: 'beds',
    defaultWidth: 100,
    defaultDepth: 200,
    color: '#c9a9c9',
    icon: 'Bed',
  },
  {
    type: 'bed-double',
    name: 'Double Bed',
    category: 'beds',
    defaultWidth: 160,
    defaultDepth: 200,
    color: '#bd9bbd',
    icon: 'BedDouble',
  },

  // ── Storage ───────────────────────────────────────────────────────────────
  {
    type: 'wardrobe',
    name: 'Wardrobe',
    category: 'storage',
    defaultWidth: 120,
    defaultDepth: 60,
    color: '#a98e74',
    icon: 'Archive',
  },
  {
    type: 'bookshelf',
    name: 'Bookshelf',
    category: 'storage',
    defaultWidth: 90,
    defaultDepth: 30,
    color: '#b69a7d',
    icon: 'BookOpen',
  },
  {
    type: 'dresser',
    name: 'Dresser',
    category: 'storage',
    defaultWidth: 100,
    defaultDepth: 50,
    color: '#c0a585',
    icon: 'Archive',
  },

  // ── Kitchen ───────────────────────────────────────────────────────────────
  {
    type: 'counter',
    name: 'Counter',
    category: 'kitchen',
    defaultWidth: 120,
    defaultDepth: 60,
    color: '#9fb3a8',
    icon: 'Square',
  },
  {
    type: 'fridge',
    name: 'Fridge',
    category: 'kitchen',
    defaultWidth: 70,
    defaultDepth: 70,
    color: '#aebfd6',
    icon: 'Refrigerator',
  },
  {
    type: 'stove',
    name: 'Stove',
    category: 'kitchen',
    defaultWidth: 60,
    defaultDepth: 60,
    color: '#b0b0b8',
    icon: 'Flame',
  },
  {
    type: 'sink',
    name: 'Kitchen Sink',
    category: 'kitchen',
    defaultWidth: 80,
    defaultDepth: 60,
    color: '#a7c4cf',
    icon: 'Droplets',
  },

  // ── Bathroom ──────────────────────────────────────────────────────────────
  {
    type: 'toilet',
    name: 'Toilet',
    category: 'bathroom',
    defaultWidth: 40,
    defaultDepth: 70,
    color: '#cfd8dc',
    icon: 'Toilet',
  },
  {
    type: 'bathtub',
    name: 'Bathtub',
    category: 'bathroom',
    defaultWidth: 170,
    defaultDepth: 75,
    color: '#bcd4dd',
    icon: 'Bath',
  },
  {
    type: 'sink-bath',
    name: 'Bathroom Sink',
    category: 'bathroom',
    defaultWidth: 60,
    defaultDepth: 45,
    color: '#c5dbe2',
    icon: 'Droplet',
  },

  // ── Decor ─────────────────────────────────────────────────────────────────
  {
    type: 'rug',
    name: 'Rug',
    category: 'decor',
    defaultWidth: 200,
    defaultDepth: 140,
    color: '#d6a4a4',
    icon: 'Frame',
  },
  {
    type: 'plant',
    name: 'Plant',
    category: 'decor',
    defaultWidth: 40,
    defaultDepth: 40,
    color: '#8fbf8f',
    icon: 'Sprout',
  },
  {
    type: 'lamp',
    name: 'Lamp',
    category: 'decor',
    defaultWidth: 35,
    defaultDepth: 35,
    color: '#e0cf9a',
    icon: 'Lamp',
  },
];

/** Group catalog prototypes by category, preserving CATEGORY_ORDER. */
export function groupByCategory(
  items: ItemPrototype[] = CATALOG,
): { category: CatalogCategory; label: string; items: ItemPrototype[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}
