// Flooring — panel editor + on-canvas render.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { PropertiesPanel } from './PropertiesPanel';
import { AreasLayer } from '../render/layers/AreasLayer';
import { usePlannerStore } from '../store';
import { makeSampleScene } from '../__fixtures__/sampleScene';
import { getSelectedLayer } from '../store/helpers';
import { roomId } from '../utils/areaDetection';
import { makeFlooring } from '../flooring/catalog';

const LEFT = roomId(['v1', 'v2', 'v5', 'v6']);
const layer = () => getSelectedLayer(usePlannerStore.getState().scene);

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearSelection();
});

describe('PropertiesPanel — flooring', () => {
  it('sets a flooring type from defaults when chosen', () => {
    act(() => usePlannerStore.getState().select('areas', LEFT));
    const { getByLabelText } = render(<PropertiesPanel />);
    const select = getByLabelText('Flooring type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'laminate' } });
    const f = layer().areas[LEFT]?.flooring;
    expect(f).toEqual(makeFlooring('laminate'));
  });

  it('reveals the pattern dropdown and changes the pattern', () => {
    act(() => usePlannerStore.getState().setAreaFlooring(LEFT, makeFlooring('parquet')));
    act(() => usePlannerStore.getState().select('areas', LEFT));
    const { getByLabelText } = render(<PropertiesPanel />);
    const pattern = getByLabelText('Flooring pattern') as HTMLSelectElement;
    fireEvent.change(pattern, { target: { value: 'chevron' } });
    expect(layer().areas[LEFT]?.flooring?.pattern).toBe('chevron');
  });

  it('clears flooring when "None" is chosen', () => {
    act(() => usePlannerStore.getState().setAreaFlooring(LEFT, makeFlooring('tile')));
    act(() => usePlannerStore.getState().select('areas', LEFT));
    const { getByLabelText } = render(<PropertiesPanel />);
    const select = getByLabelText('Flooring type') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '' } });
    expect(layer().areas[LEFT]?.flooring).toBeUndefined();
  });
});

describe('AreasLayer — flooring render', () => {
  it('paints floor tiles for a room with flooring set', () => {
    act(() =>
      usePlannerStore
        .getState()
        .setAreaFlooring(LEFT, makeFlooring('tile', { pattern: 'grid' })),
    );
    const { container } = render(
      <svg>
        <AreasLayer />
      </svg>,
    );
    const floor = container.querySelector('[data-floor="tile"]');
    expect(floor).not.toBeNull();
    // Grid pattern produces multiple tile polygons inside the floor group.
    expect(floor!.querySelectorAll('polygon').length).toBeGreaterThan(1);
  });

  it('renders no floor group for a room without flooring', () => {
    const { container } = render(
      <svg>
        <AreasLayer />
      </svg>,
    );
    expect(container.querySelector('[data-floor]')).toBeNull();
  });
});
