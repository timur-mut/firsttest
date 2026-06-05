// Unit 6 — ItemsLayer renders furniture from the active layer.

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ItemsLayer } from './ItemsLayer';
import { usePlannerStore } from '../../store';
import { makeSampleScene } from '../../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

describe('ItemsLayer', () => {
  it('renders a selectable group for each item in the active layer', () => {
    const { container } = render(
      <svg>
        <ItemsLayer />
      </svg>,
    );
    const items = container.querySelectorAll('[data-el-kind="items"]');
    // Sample scene ships exactly one sofa.
    expect(items.length).toBe(1);
    expect(items[0].getAttribute('data-el-id')).toBe('i-sofa');
  });

  it('reflects items added to the store', () => {
    usePlannerStore.getState().addItem({ type: 'bed', width: 200, depth: 160, color: '#22c55e' }, 600, 600);
    const { container } = render(
      <svg>
        <ItemsLayer />
      </svg>,
    );
    expect(container.querySelectorAll('[data-el-kind="items"]').length).toBe(2);
  });
});
