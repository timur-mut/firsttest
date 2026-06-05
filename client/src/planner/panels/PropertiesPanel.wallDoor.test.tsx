import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import { getSelectedLayer } from '../store/helpers';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearSelection();
});

const layer = () => getSelectedLayer(usePlannerStore.getState().scene);

describe('PropertiesPanel — wall thickness', () => {
  it('edits the selected wall thickness', () => {
    act(() => usePlannerStore.getState().select('lines', 'l-top-left'));
    const { container } = render(<PropertiesPanel />);
    const input = container.querySelector('[data-section="line"] input') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: '42' } });
    expect(layer().lines['l-top-left'].thickness).toBe(42);
  });
});

describe('PropertiesPanel — door orientation', () => {
  it('flips hinge and swing for a selected door', () => {
    act(() => usePlannerStore.getState().select('holes', 'h-door'));
    const { getByLabelText } = render(<PropertiesPanel />);
    fireEvent.click(getByLabelText('Flip door hinge'));
    expect(layer().holes['h-door'].flipX).toBe(true);
    fireEvent.click(getByLabelText('Flip door swing'));
    expect(layer().holes['h-door'].flipY).toBe(true);
  });

  it('does not show door orientation controls for a window', () => {
    act(() => usePlannerStore.getState().select('holes', 'h-window'));
    const { queryByLabelText } = render(<PropertiesPanel />);
    expect(queryByLabelText('Flip door hinge')).toBeNull();
  });
});
