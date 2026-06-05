import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { VerticesLayer } from './VerticesLayer';
import { usePlannerStore } from '../../store';
import { makeSampleScene } from '../../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
});

describe('VerticesLayer', () => {
  it('renders a grabbable handle for every corner', () => {
    const { container } = render(
      <svg>
        <VerticesLayer />
      </svg>,
    );
    // The fixture has 6 vertices; each renders a hit target tagged for selection.
    const handles = container.querySelectorAll('[data-el-kind="vertices"]');
    expect(handles.length).toBe(6);
    // Each handle carries its vertex id so the select tool can pick it.
    expect(container.querySelector('[data-el-id="v1"][data-el-kind="vertices"]')).toBeTruthy();
  });
});
