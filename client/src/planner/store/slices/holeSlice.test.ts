// Unit 3 tests — hole (door/window) store operations and rendering.

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { usePlannerStore } from '../index';
import { makeSampleScene } from '../../__fixtures__/sampleScene';
import { getSelectedLayer } from '../helpers';
import { HolesLayer } from '../../render/layers/HolesLayer';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
  usePlannerStore.getState().clearHistory();
});

const layer = () => getSelectedLayer(usePlannerStore.getState().scene);

describe('addHole', () => {
  it('adds a hole to layer.holes and to the target line.holes', () => {
    const before = Object.keys(layer().holes).length;
    usePlannerStore.getState().addHole('l-top-left', 'door', 0.4);

    const holes = layer().holes;
    expect(Object.keys(holes).length).toBe(before + 1);

    const added = Object.values(holes).find((h) => h.lineId === 'l-top-left');
    expect(added).toBeDefined();
    expect(added!.type).toBe('door');
    expect(layer().lines['l-top-left'].holes).toContain(added!.id);
  });

  it('applies sensible per-type defaults', () => {
    usePlannerStore.getState().addHole('l-top-left', 'door', 0.5);
    const door = Object.values(layer().holes).find((h) => h.lineId === 'l-top-left')!;
    expect(door).toMatchObject({ width: 90, height: 210, altitude: 0 });

    usePlannerStore.getState().addHole('l-right', 'window', 0.5);
    const window = Object.values(layer().holes).find((h) => h.lineId === 'l-right')!;
    expect(window).toMatchObject({ width: 120, height: 100, altitude: 90 });
  });

  it('clamps the offset so the hole stays within the wall', () => {
    // l-top-left runs v1(100,100) -> v2(500,100): length 400. A 90-wide door
    // has margin (45/400)=0.1125, so offset 0 must clamp up to that margin.
    usePlannerStore.getState().addHole('l-top-left', 'door', 0);
    const door = Object.values(layer().holes).find((h) => h.lineId === 'l-top-left')!;
    expect(door.offset).toBeCloseTo(45 / 400, 5);
    expect(door.offset).toBeGreaterThan(0);

    usePlannerStore.getState().addHole('l-top-right', 'door', 1);
    const door2 = Object.values(layer().holes).find(
      (h) => h.lineId === 'l-top-right' && h.id !== 'h-window',
    )!;
    expect(door2.offset).toBeCloseTo(1 - 45 / 400, 5);
    expect(door2.offset).toBeLessThan(1);
  });

  it('records exactly one undo step', () => {
    const undosBefore = usePlannerStore.getState().history.past.length;
    usePlannerStore.getState().addHole('l-top-left', 'door', 0.4);
    expect(usePlannerStore.getState().history.past.length).toBe(undosBefore + 1);
  });

  it('does nothing for an unknown line', () => {
    const before = Object.keys(layer().holes).length;
    usePlannerStore.getState().addHole('nope', 'door', 0.5);
    expect(Object.keys(layer().holes).length).toBe(before);
  });
});

describe('moveHole', () => {
  it('updates the offset', () => {
    usePlannerStore.getState().moveHole('h-door', 0.3);
    expect(layer().holes['h-door'].offset).toBeCloseTo(0.3, 5);
  });

  it('clamps an out-of-range offset within the wall', () => {
    // h-door on l-left: v6(100,400)->v1(100,100), length 300, width 90.
    // margin = 45/300 = 0.15.
    usePlannerStore.getState().moveHole('h-door', 0);
    expect(layer().holes['h-door'].offset).toBeCloseTo(45 / 300, 5);

    usePlannerStore.getState().moveHole('h-door', 5);
    expect(layer().holes['h-door'].offset).toBeCloseTo(1 - 45 / 300, 5);
  });

  it('records exactly one undo step', () => {
    const undosBefore = usePlannerStore.getState().history.past.length;
    usePlannerStore.getState().moveHole('h-door', 0.3);
    expect(usePlannerStore.getState().history.past.length).toBe(undosBefore + 1);
  });
});

describe('removeHole', () => {
  it('removes the hole from layer.holes and its line.holes', () => {
    expect(layer().holes['h-door']).toBeDefined();
    usePlannerStore.getState().removeHole('h-door');
    expect(layer().holes['h-door']).toBeUndefined();
    expect(layer().lines['l-left'].holes).not.toContain('h-door');
  });

  it('records exactly one undo step', () => {
    const undosBefore = usePlannerStore.getState().history.past.length;
    usePlannerStore.getState().removeHole('h-door');
    expect(usePlannerStore.getState().history.past.length).toBe(undosBefore + 1);
  });
});

describe('updateHole', () => {
  it('patches width/height/altitude', () => {
    usePlannerStore.getState().updateHole('h-window', { width: 200, height: 150, altitude: 60 });
    expect(layer().holes['h-window']).toMatchObject({ height: 150, altitude: 60 });
    expect(layer().holes['h-window'].width).toBe(200);
  });

  it('re-clamps the offset when width grows', () => {
    // h-window on l-top-right: v2(500,100)->v3(900,100), length 400.
    // Push it near the end, then widen so it must clamp back inward.
    usePlannerStore.getState().moveHole('h-window', 0.9);
    usePlannerStore.getState().updateHole('h-window', { width: 300 });
    // margin = 150/400 = 0.375 -> max offset = 0.625.
    expect(layer().holes['h-window'].offset).toBeCloseTo(1 - 150 / 400, 5);
  });

  it('records exactly one undo step', () => {
    const undosBefore = usePlannerStore.getState().history.past.length;
    usePlannerStore.getState().updateHole('h-door', { width: 100 });
    expect(usePlannerStore.getState().history.past.length).toBe(undosBefore + 1);
  });
});

describe('HolesLayer render', () => {
  it('renders a glyph for each hole in the fixture', () => {
    const { container } = render(createElement(HolesLayer));
    const glyphs = container.querySelectorAll('[data-el-kind="holes"]');
    expect(glyphs.length).toBe(2);
  });
});
