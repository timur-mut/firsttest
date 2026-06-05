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
  it('renders one polygon per wall, tagged for selection', () => {
    const { container } = renderSvg(<WallsLayer />);
    const walls = container.querySelectorAll('polygon[data-el-kind="lines"]');
    // Sample scene has 7 walls.
    expect(walls.length).toBe(7);
    walls.forEach((w) => expect(w.getAttribute('data-el-id')).toBeTruthy());
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
