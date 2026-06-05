// Unit 7 — selection slice tests. Exercises select/selectMany/clearSelection
// and verifies that selection changes never create undo steps.

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../index';
import { makeSampleScene } from '../../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

describe('select', () => {
  it('replaces the selection in non-additive mode', () => {
    const { select } = usePlannerStore.getState();
    select('items', 'i-sofa');
    expect(usePlannerStore.getState().selected.items).toEqual(['i-sofa']);

    // A second non-additive select on a different bucket replaces everything.
    select('lines', 'l-mid');
    const sel = usePlannerStore.getState().selected;
    expect(sel.lines).toEqual(['l-mid']);
    expect(sel.items).toEqual([]);
  });

  it('extends within a bucket in additive mode', () => {
    const { select } = usePlannerStore.getState();
    select('lines', 'l-mid');
    select('lines', 'l-left', true);
    expect(usePlannerStore.getState().selected.lines).toEqual(['l-mid', 'l-left']);
  });

  it('toggles an already-selected id off in additive mode', () => {
    const { select } = usePlannerStore.getState();
    select('lines', 'l-mid');
    select('lines', 'l-left', true);
    select('lines', 'l-mid', true);
    expect(usePlannerStore.getState().selected.lines).toEqual(['l-left']);
  });

  it('keeps other buckets intact when extending additively across kinds', () => {
    const { select } = usePlannerStore.getState();
    select('items', 'i-sofa');
    select('lines', 'l-mid', true);
    const sel = usePlannerStore.getState().selected;
    expect(sel.items).toEqual(['i-sofa']);
    expect(sel.lines).toEqual(['l-mid']);
  });
});

describe('selectMany', () => {
  it('replaces the whole selection from a partial', () => {
    const { selectMany } = usePlannerStore.getState();
    selectMany({ holes: ['h-door'], items: ['i-sofa'] });
    const sel = usePlannerStore.getState().selected;
    expect(sel.holes).toEqual(['h-door']);
    expect(sel.items).toEqual(['i-sofa']);
    expect(sel.lines).toEqual([]);
    expect(sel.vertices).toEqual([]);
    expect(sel.areas).toEqual([]);
  });
});

describe('clearSelection', () => {
  it('empties every bucket', () => {
    const { select, selectMany, clearSelection } = usePlannerStore.getState();
    select('items', 'i-sofa');
    select('lines', 'l-mid', true);
    selectMany({ holes: ['h-door'], lines: ['l-mid'], items: ['i-sofa'] });
    clearSelection();
    const sel = usePlannerStore.getState().selected;
    expect(sel).toEqual({ vertices: [], lines: [], holes: [], items: [], areas: [] });
  });
});

describe('selection + history', () => {
  it('does NOT create an undo step when selecting', () => {
    const store = usePlannerStore.getState();
    expect(store.canUndo()).toBe(false);
    store.select('items', 'i-sofa');
    store.select('lines', 'l-mid', true);
    store.clearSelection();
    expect(usePlannerStore.getState().canUndo()).toBe(false);
  });
});

describe('deleteSelected', () => {
  it('clears the selection for the items bucket', () => {
    const store = usePlannerStore.getState();
    store.select('items', 'i-sofa');
    expect(usePlannerStore.getState().selected.items).toEqual(['i-sofa']);
    store.deleteSelected();
    const sel = usePlannerStore.getState().selected;
    expect(sel.items).toEqual([]);
    expect(sel).toEqual({ vertices: [], lines: [], holes: [], items: [], areas: [] });
  });
});
