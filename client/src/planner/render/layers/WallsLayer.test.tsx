// Unit 2 — render smoke tests for the walls + draft layers.

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { usePlannerStore } from '@/planner/store';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';
import { WallsLayer } from './WallsLayer';
import { DraftLayer } from './DraftLayer';

function renderSvg(node: React.ReactNode) {
  return render(<svg>{node}</svg>);
}

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

describe('WallsLayer', () => {
  it('renders a tagged polygon for every wall (shared walls once per room)', () => {
    const { container } = renderSvg(<WallsLayer />);
    const walls = container.querySelectorAll('polygon[data-el-kind="lines"]');
    walls.forEach((w) => expect(w.getAttribute('data-el-id')).toBeTruthy());
    // All 7 walls are represented; the shared middle wall (l-mid) renders one
    // mitered quad per room, so 8 polygons cover 7 distinct lines.
    const lineIds = new Set(Array.from(walls).map((w) => w.getAttribute('data-el-id')));
    expect(lineIds.size).toBe(7);
    expect(walls.length).toBe(8);
  });
});

describe('WallsLayer — open (non-closing) interior walls', () => {
  function addOpen(
    verts: { id: string; x: number; y: number }[],
    lines: { id: string; a: string; b: string }[],
  ) {
    const scene = makeSampleScene();
    const layer = scene.layers['layer-1'];
    for (const v of verts) layer.vertices[v.id] = { id: v.id, x: v.x, y: v.y, lines: [] };
    for (const l of lines)
      layer.lines[l.id] = {
        id: l.id,
        type: 'wall',
        vertices: [l.a, l.b] as [string, string],
        thickness: 20,
        height: 280,
        holes: [],
      };
    usePlannerStore.getState().setScene(scene);
  }

  it('renders a free-standing stub as a rectangle with square ends (no end discs)', () => {
    addOpen(
      [
        { id: 's1', x: 200, y: 250 },
        { id: 's2', x: 350, y: 250 },
      ],
      [{ id: 'l-stub', a: 's1', b: 's2' }],
    );
    const { container } = renderSvg(<WallsLayer />);
    // The stub renders as exactly one rectangle polygon...
    expect(container.querySelector('polygon[data-el-id="l-stub"]')).not.toBeNull();
    // ...and no joint disc rounds its free ends.
    expect(container.querySelectorAll('circle').length).toBe(0);
  });

  it('fills the corner with a single disc where two open walls meet', () => {
    addOpen(
      [
        { id: 's1', x: 200, y: 250 },
        { id: 's2', x: 300, y: 250 },
        { id: 's3', x: 300, y: 350 },
      ],
      [
        { id: 'o1', a: 's1', b: 's2' },
        { id: 'o2', a: 's2', b: 's3' },
      ],
    );
    const { container } = renderSvg(<WallsLayer />);
    const discs = container.querySelectorAll('circle');
    expect(discs.length).toBe(1); // only the shared vertex s2 (degree 2)
    expect(discs[0].getAttribute('cx')).toBe('300');
    expect(discs[0].getAttribute('cy')).toBe('250');
  });
});

describe('DraftLayer', () => {
  it('renders nothing when not drawing', () => {
    const { container } = renderSvg(<DraftLayer />);
    expect(container.querySelector('[data-layer="wall-draft"]')).toBeNull();
  });

  it('renders the chain + preview while drawing', () => {
    usePlannerStore.getState().beginWall(1000, 1000);
    usePlannerStore.getState().addWallPoint(1200, 1000);
    usePlannerStore.getState().updateWallDraft(1200, 1200);

    const { container } = renderSvg(<DraftLayer />);
    expect(container.querySelector('[data-layer="wall-draft"]')).not.toBeNull();
    // Live preview segment to the cursor.
    expect(container.querySelector('line')).not.toBeNull();
    // Two committed chain points.
    expect(container.querySelectorAll('circle.fill-primary').length).toBe(2);
  });
});
