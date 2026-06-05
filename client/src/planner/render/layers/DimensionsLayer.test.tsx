// Tests for the dimensions / measurement overlay (Unit 7). Renders the layer
// against the canonical sample scene and asserts one label per wall plus correct
// unit formatting.

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { DimensionsLayer, formatLength } from './DimensionsLayer';
import { usePlannerStore } from '@/planner/store';
import { makeSampleScene } from '@/planner/__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
});

function renderLayer() {
  return render(
    <svg>
      <DimensionsLayer />
    </svg>,
  );
}

describe('DimensionsLayer', () => {
  it('renders an inner dimension label per room wall (shared wall once per room)', () => {
    const { container } = renderLayer();
    const labels = container.querySelectorAll('[data-dimension-for]');
    // Left + right rooms have 4 walls each; the shared middle wall is measured
    // from both rooms, so 8 labels cover the 7 walls.
    expect(labels.length).toBe(8);
    expect(container.querySelectorAll('text').length).toBe(8);
  });

  it('measures walls on the INSIDE: the top-left wall reads 3.70 m, not 4.00 m', () => {
    const { container } = renderLayer();
    // Outer (vertex-to-vertex) is 400 cm; the inner face is 370 cm after the
    // adjacent walls inset (left wall 20, shared middle wall 10 on this side).
    const topLeft = container.querySelector('[data-dimension-for="l-top-left"] text');
    expect(topLeft?.textContent).toBe('3.70 m');
  });

  it('renders a non-interactive group', () => {
    const { container } = renderLayer();
    const group = container.querySelector('[data-layer="dimensions"]') as SVGGElement;
    expect(group).toBeTruthy();
    expect(group.style.pointerEvents).toBe('none');
    // Nothing is tagged as selectable.
    expect(container.querySelectorAll('[data-el-kind]').length).toBe(0);
  });

  it('scales font-size inversely with zoom', () => {
    usePlannerStore.getState().setScene(makeSampleScene());
    const { container, rerender } = renderLayer();
    const fontAt1 = container.querySelector('text')?.getAttribute('font-size');

    usePlannerStore.setState({ zoom: 2 });
    rerender(
      <svg>
        <DimensionsLayer />
      </svg>,
    );
    const fontAt2 = container.querySelector('text')?.getAttribute('font-size');

    expect(Number(fontAt1)).toBeGreaterThan(Number(fontAt2));
  });
});

describe('formatLength', () => {
  it('shows meters at or above 100 cm', () => {
    expect(formatLength(400, 'cm')).toBe('4.00 m');
    expect(formatLength(100, 'cm')).toBe('1.00 m');
    expect(formatLength(250, 'cm')).toBe('2.50 m');
  });

  it('shows centimeters below 100 cm', () => {
    expect(formatLength(40, 'cm')).toBe('40 cm');
    expect(formatLength(99, 'cm')).toBe('99 cm');
  });
});
