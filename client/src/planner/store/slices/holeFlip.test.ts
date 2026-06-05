import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../index';
import { makeSampleScene } from '../../__fixtures__/sampleScene';
import { getSelectedLayer } from '../helpers';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

const hole = (id: string) => getSelectedLayer(usePlannerStore.getState().scene).holes[id];

describe('updateHole door orientation', () => {
  it('toggles flipX / flipY and records undo steps', () => {
    // The fixture door 'h-door' starts with no explicit orientation.
    expect(hole('h-door').flipX ?? false).toBe(false);
    usePlannerStore.getState().updateHole('h-door', { flipX: true });
    expect(hole('h-door').flipX).toBe(true);
    usePlannerStore.getState().updateHole('h-door', { flipY: true });
    expect(hole('h-door').flipY).toBe(true);
    usePlannerStore.getState().undo();
    expect(hole('h-door').flipY ?? false).toBe(false);
    expect(hole('h-door').flipX).toBe(true);
  });
});
