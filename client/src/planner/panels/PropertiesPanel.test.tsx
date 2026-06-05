// Unit 7 — properties panel tests. Selecting the fixture sofa should render the
// furniture editors, and editing the width should call through to updateItem.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

describe('PropertiesPanel', () => {
  it('shows "Nothing selected" when the selection is empty', () => {
    render(<PropertiesPanel />);
    expect(screen.getByText(/nothing selected/i)).toBeInTheDocument();
  });

  it('renders furniture editors for a selected item', () => {
    usePlannerStore.getState().select('items', 'i-sofa');
    render(<PropertiesPanel />);
    expect(screen.getByText('Furniture')).toBeInTheDocument();
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('Depth')).toBeInTheDocument();
    expect(screen.getByText('Rotation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls updateItem with the new width when the width field changes', () => {
    usePlannerStore.getState().select('items', 'i-sofa');
    const spy = vi.spyOn(usePlannerStore.getState(), 'updateItem');
    render(<PropertiesPanel />);

    // Width input shows the sofa's current width (180).
    const widthInput = screen.getByDisplayValue('180') as HTMLInputElement;
    fireEvent.change(widthInput, { target: { value: '220' } });

    expect(spy).toHaveBeenCalledWith('i-sofa', { width: 220 });
    spy.mockRestore();
  });

  it('calls deleteSelected when Delete is clicked', () => {
    usePlannerStore.getState().select('items', 'i-sofa');
    const spy = vi.spyOn(usePlannerStore.getState(), 'deleteSelected');
    render(<PropertiesPanel />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
