// Unit 4 — AreasLayer render test. Mounts the layer against the sample scene and
// asserts it renders one polygon per detected room with an m² label.

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AreasLayer } from './AreasLayer';
import { usePlannerStore } from '../../store';
import { makeSampleScene } from '../../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

function renderSvg() {
  return render(
    <svg>
      <AreasLayer />
    </svg>,
  );
}

describe('AreasLayer', () => {
  it('renders two area polygons for the sample scene', () => {
    const { container } = renderSvg();
    const polygons = container.querySelectorAll('polygon[data-el-kind="areas"]');
    expect(polygons.length).toBe(2);
  });

  it('labels each room with inner area (m²) and perimeter (m)', () => {
    const { container } = renderSvg();
    const labels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    expect(labels).toHaveLength(2);
    // Inner area = 9.62 m², inner perimeter = 12.60 m (see areaDetection tests).
    for (const label of labels) {
      expect(label).toContain('9.62 m²');
      expect(label).toContain('12.60 m perimeter');
    }
  });

  it('tags polygons with data-el-id / data-el-kind for selection', () => {
    const { container } = renderSvg();
    const groups = container.querySelectorAll('g[data-el-kind="areas"][data-el-id]');
    expect(groups.length).toBe(2);
  });
});
