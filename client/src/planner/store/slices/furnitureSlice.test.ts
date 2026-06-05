// Unit 6 — furniture slice tests. Each op is one undo step and reverts cleanly.

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlannerStore } from '../index';
import { makeSampleScene } from '../../__fixtures__/sampleScene';

function layer() {
  const s = usePlannerStore.getState();
  return s.scene.layers[s.scene.selectedLayer];
}

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

const SOFA = { type: 'sofa', width: 200, depth: 90, color: '#ef4444' };

describe('addItem', () => {
  it('creates an item at the given center with the right dimensions/color and returns its id', () => {
    const id = usePlannerStore.getState().addItem(SOFA, 640, 320);
    expect(typeof id).toBe('string');
    expect(id.startsWith('item-')).toBe(true);

    const item = layer().items[id];
    expect(item).toBeDefined();
    expect(item.x).toBe(640);
    expect(item.y).toBe(320);
    expect(item.width).toBe(200);
    expect(item.depth).toBe(90);
    expect(item.type).toBe('sofa');
    expect(item.rotation).toBe(0);
    expect(item.properties.color).toBe('#ef4444');
  });

  it('records exactly one undo step and undo() removes the item', () => {
    const before = Object.keys(layer().items).length;
    const id = usePlannerStore.getState().addItem(SOFA, 100, 100);
    expect(Object.keys(layer().items).length).toBe(before + 1);
    expect(usePlannerStore.getState().history.past.length).toBe(1);

    usePlannerStore.getState().undo();
    expect(layer().items[id]).toBeUndefined();
    expect(Object.keys(layer().items).length).toBe(before);
  });
});

describe('moveItem', () => {
  it('moves the item center and undo reverts it', () => {
    usePlannerStore.getState().moveItem('i-sofa', 750, 760);
    let item = layer().items['i-sofa'];
    expect(item.x).toBe(750);
    expect(item.y).toBe(760);
    expect(usePlannerStore.getState().history.past.length).toBe(1);

    usePlannerStore.getState().undo();
    item = layer().items['i-sofa'];
    expect(item.x).toBe(300);
    expect(item.y).toBe(300);
  });

  it('ignores an unknown id without recording history', () => {
    usePlannerStore.getState().moveItem('nope', 10, 10);
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });
});

describe('rotateItem', () => {
  it('normalizes the angle into [0,360) and undo reverts', () => {
    usePlannerStore.getState().rotateItem('i-sofa', 450);
    expect(layer().items['i-sofa'].rotation).toBe(90);

    usePlannerStore.getState().rotateItem('i-sofa', -90);
    expect(layer().items['i-sofa'].rotation).toBe(270);

    expect(usePlannerStore.getState().history.past.length).toBe(2);
    usePlannerStore.getState().undo();
    expect(layer().items['i-sofa'].rotation).toBe(90);
  });
});

describe('updateItem', () => {
  it('patches dimensions/rotation and merges properties; undo reverts', () => {
    usePlannerStore.getState().updateItem('i-sofa', {
      width: 250,
      depth: 120,
      rotation: 360,
      properties: { color: '#10b981', material: 'leather' },
    });
    const item = layer().items['i-sofa'];
    expect(item.width).toBe(250);
    expect(item.depth).toBe(120);
    expect(item.rotation).toBe(0); // 360 normalized
    expect(item.properties.color).toBe('#10b981');
    expect(item.properties.material).toBe('leather');
    expect(usePlannerStore.getState().history.past.length).toBe(1);

    usePlannerStore.getState().undo();
    const reverted = layer().items['i-sofa'];
    expect(reverted.width).toBe(180);
    expect(reverted.properties.color).toBe('#8b5cf6');
    expect(reverted.properties.material).toBeUndefined();
  });

  it('ignores an unknown id without recording history', () => {
    usePlannerStore.getState().updateItem('nope', { width: 1 });
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });
});

describe('removeItem', () => {
  it('deletes the item and undo restores it', () => {
    usePlannerStore.getState().removeItem('i-sofa');
    expect(layer().items['i-sofa']).toBeUndefined();
    expect(usePlannerStore.getState().history.past.length).toBe(1);

    usePlannerStore.getState().undo();
    expect(layer().items['i-sofa']).toBeDefined();
    expect(layer().items['i-sofa'].x).toBe(300);
  });

  it('ignores an unknown id without recording history', () => {
    usePlannerStore.getState().removeItem('nope');
    expect(usePlannerStore.getState().history.past.length).toBe(0);
  });
});
