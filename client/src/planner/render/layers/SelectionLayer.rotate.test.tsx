// Verifies the rotate handle renders as an interactive, tagged element when a
// single item is selected, so the select tool can start a rotation gesture.
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { SelectionLayer } from './SelectionLayer';
import { usePlannerStore } from '../../store';
import { makeSampleScene } from '../../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearSelection();
});

describe('SelectionLayer rotate handle', () => {
  it('renders an interactive rotate handle for the selected item', () => {
    usePlannerStore.getState().select('items', 'i-sofa');
    const { container } = render(
      <svg>
        <SelectionLayer />
      </svg>,
    );
    const handle = container.querySelector('[data-handle="rotate"]');
    expect(handle).toBeTruthy();
    // It is tagged as the item so the Viewport reports targetId/targetKind, and
    // re-enables pointer events (the layer group is pointer-events: none).
    expect(handle?.getAttribute('data-el-id')).toBe('i-sofa');
    expect(handle?.getAttribute('data-el-kind')).toBe('items');
    expect(handle?.getAttribute('pointer-events')).toBe('auto');
  });

  it('shows no rotate handle when nothing is selected', () => {
    const { container } = render(
      <svg>
        <SelectionLayer />
      </svg>,
    );
    expect(container.querySelector('[data-handle="rotate"]')).toBeNull();
  });
});
