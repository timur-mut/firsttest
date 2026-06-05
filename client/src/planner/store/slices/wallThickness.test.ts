import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../index';
import { makeSampleScene } from '../../__fixtures__/sampleScene';
import { getSelectedLayer } from '../helpers';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

const line = (id: string) => getSelectedLayer(usePlannerStore.getState().scene).lines[id];

describe('setLineThickness', () => {
  it('sets a wall thickness and records one undo step', () => {
    expect(line('l-top-left').thickness).toBe(20);
    usePlannerStore.getState().setLineThickness('l-top-left', 35);
    expect(line('l-top-left').thickness).toBe(35);
    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(line('l-top-left').thickness).toBe(20);
  });

  it('clamps to a minimum of 1 and ignores unknown walls', () => {
    usePlannerStore.getState().setLineThickness('l-top-left', -5);
    expect(line('l-top-left').thickness).toBe(1);
    usePlannerStore.getState().setLineThickness('nope', 50); // no throw, no-op
    expect(line('l-top-left').thickness).toBe(1);
  });
});
