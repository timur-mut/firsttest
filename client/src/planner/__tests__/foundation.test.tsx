// Foundation smoke tests — prove the contract, store, and render mount wire
// together end-to-end against the sample scene. Feature units add their own
// tests next to their modules.

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PlannerApp } from '../PlannerApp';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import { distance, polygonArea } from '../contract/geometry';
import { snapPoint } from '../contract/snapping';

beforeEach(() => {
  // Reset the singleton store to a clean sample scene before each test.
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

describe('geometry', () => {
  it('computes distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it('computes polygon area (shoelace)', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(polygonArea(square)).toBe(100);
  });
});

describe('snapping', () => {
  it('snaps to a nearby vertex with highest priority', () => {
    const layer = usePlannerStore.getState().scene.layers['layer-1'];
    const result = snapPoint(
      { x: 104, y: 103 },
      { vertices: layer.vertices, lines: layer.lines, gridSize: 20, radius: 12, mask: { grid: true, vertex: true, line: true, guide: true } },
    );
    expect(result.snap?.kind).toBe('vertex');
    expect(result).toMatchObject({ x: 100, y: 100 });
  });
});

describe('store + history', () => {
  it('records and undoes a scene mutation', () => {
    const store = usePlannerStore.getState();
    expect(store.scene.name).toBe('Sample Plan');
    store.renameProject('Renamed');
    expect(usePlannerStore.getState().scene.name).toBe('Renamed');
    expect(usePlannerStore.getState().canUndo()).toBe(true);
    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().scene.name).toBe('Sample Plan');
    usePlannerStore.getState().redo();
    expect(usePlannerStore.getState().scene.name).toBe('Renamed');
  });

  it('does not record viewport changes in history', () => {
    usePlannerStore.getState().clearHistory();
    usePlannerStore.getState().setZoom(2);
    expect(usePlannerStore.getState().canUndo()).toBe(false);
  });
});

describe('render mount', () => {
  it('renders the app shell with an SVG canvas and the sample walls', () => {
    const { container } = render(<PlannerApp />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Sample scene has 7 walls; the foundation walls layer renders each.
    const walls = container.querySelectorAll('[data-el-kind="lines"]');
    expect(walls.length).toBe(7);
    // And one furniture item.
    const items = container.querySelectorAll('[data-el-kind="items"]');
    expect(items.length).toBe(1);
  });
});
