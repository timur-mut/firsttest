// Tests for room labeling (name) + the deterministic room id that lets a label
// survive recomputation.
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../index';
import { makeSampleScene } from '../../__fixtures__/sampleScene';
import { getSelectedLayer } from '../helpers';
import { detectAreas, roomId } from '../../utils/areaDetection';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

const layer = () => getSelectedLayer(usePlannerStore.getState().scene);
const LEFT = roomId(['v1', 'v2', 'v5', 'v6']);

describe('roomId', () => {
  it('is invariant under cycle rotation/reflection (vertex set only)', () => {
    expect(roomId(['v1', 'v2', 'v5', 'v6'])).toBe(roomId(['v6', 'v5', 'v2', 'v1']));
    expect(roomId(['v1', 'v2', 'v5', 'v6'])).not.toBe(roomId(['v2', 'v3', 'v4', 'v5']));
  });
});

describe('setAreaName', () => {
  it('labels a room and reflects it in detection; undo clears it', () => {
    usePlannerStore.getState().setAreaName(LEFT, 'Kitchen');
    expect(layer().areas[LEFT]?.name).toBe('Kitchen');
    expect(detectAreas(layer())[LEFT].name).toBe('Kitchen');

    expect(usePlannerStore.getState().history.past.length).toBe(1);
    usePlannerStore.getState().undo();
    expect(detectAreas(layer())[LEFT].name).toBeUndefined();
  });

  it('keeps the label after an unrelated wall edit (room corners unchanged)', () => {
    usePlannerStore.getState().setAreaName(LEFT, 'Office');
    // Move a vertex that belongs only to the OTHER room; the left room's cycle
    // (and therefore its id) is unchanged, so the label is preserved.
    usePlannerStore.getState().moveVertex('v3', 950, 100);
    expect(layer().areas[LEFT]?.name).toBe('Office');
    expect(detectAreas(layer())[LEFT].name).toBe('Office');
  });

  it('still works for a room with no stored record yet (upsert)', () => {
    // Fresh scene: layer.areas is empty until something writes an override.
    expect(Object.keys(layer().areas)).toHaveLength(0);
    usePlannerStore.getState().setAreaName(LEFT, 'Hall');
    expect(layer().areas[LEFT]?.name).toBe('Hall');
  });
});
