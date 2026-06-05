import { describe, it, expect } from 'vitest';
import { CATALOG, groupByCategory } from './data';
import type { CatalogCategory } from '@/planner/contract/catalogTypes';

const VALID_CATEGORIES: CatalogCategory[] = [
  'seating',
  'tables',
  'beds',
  'storage',
  'kitchen',
  'bathroom',
  'decor',
];

describe('CATALOG', () => {
  it('is non-empty', () => {
    expect(CATALOG.length).toBeGreaterThan(0);
  });

  it('gives every prototype positive dimensions', () => {
    for (const proto of CATALOG) {
      expect(proto.defaultWidth, proto.type).toBeGreaterThan(0);
      expect(proto.defaultDepth, proto.type).toBeGreaterThan(0);
    }
  });

  it('uses only valid categories', () => {
    for (const proto of CATALOG) {
      expect(VALID_CATEGORIES, proto.type).toContain(proto.category);
    }
  });

  it('gives every prototype a non-empty name and color', () => {
    for (const proto of CATALOG) {
      expect(proto.name.length, proto.type).toBeGreaterThan(0);
      expect(proto.color, proto.type).toMatch(/^#/);
    }
  });

  it('has unique types', () => {
    const types = CATALOG.map((p) => p.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('groupByCategory', () => {
  it('groups all catalog items, preserving category order', () => {
    const groups = groupByCategory();
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(CATALOG.length);

    // Every group's items match its category.
    for (const group of groups) {
      for (const item of group.items) {
        expect(item.category).toBe(group.category);
      }
    }
  });

  it('omits categories with no matching items', () => {
    const groups = groupByCategory(CATALOG.filter((p) => p.category === 'decor'));
    expect(groups).toHaveLength(1);
    expect(groups[0]?.category).toBe('decor');
  });
});
