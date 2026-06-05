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
