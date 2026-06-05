// Room labeling — panel editor + on-canvas label render.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { AreasLayer } from '../render/layers/AreasLayer';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import { getSelectedLayer } from '../store/helpers';
import { roomId } from '../utils/areaDetection';

const LEFT = roomId(['v1', 'v2', 'v5', 'v6']);
const layer = () => getSelectedLayer(usePlannerStore.getState().scene);

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearSelection();
});

describe('PropertiesPanel — room name', () => {
  it('shows a Name field for a selected room and commits on blur', () => {
    act(() => usePlannerStore.getState().select('areas', LEFT));
    const { getByPlaceholderText } = render(<PropertiesPanel />);
    const input = getByPlaceholderText('Room') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Living Room' } });
    fireEvent.blur(input);
    expect(layer().areas[LEFT]?.name).toBe('Living Room');
  });
});

describe('AreasLayer — room name', () => {
  it('renders the room name on the canvas once set', () => {
    act(() => usePlannerStore.getState().setAreaName(LEFT, 'Bedroom'));
    const { container } = render(
      <svg>
        <AreasLayer />
      </svg>,
    );
    const labels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    expect(labels.some((l) => l.includes('Bedroom'))).toBe(true);
    // The unnamed room still shows its area.
    expect(labels.some((l) => l.includes('9.62 m²'))).toBe(true);
  });
});
