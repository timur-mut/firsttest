import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { HolesLayer } from './HolesLayer';
import { usePlannerStore } from '../../store';
import { makeSampleScene } from '../../__fixtures__/sampleScene';

beforeEach(() => {
  usePlannerStore.getState().setScene(makeSampleScene());
});

function doorArc(container: HTMLElement): string {
  // The door swing arc is the <path> inside the door's group.
  return container.querySelector('[data-el-id="h-door"] path')?.getAttribute('d') ?? '';
}

describe('HolesLayer door orientation', () => {
  it('redraws the swing arc when the door orientation is flipped', () => {
    const { container } = render(
      <svg>
        <HolesLayer />
      </svg>,
    );
    const base = doorArc(container);
    expect(base).not.toBe('');

    act(() => usePlannerStore.getState().updateHole('h-door', { flipX: true }));
    const flippedHinge = doorArc(container);
    expect(flippedHinge).not.toBe(base);

    act(() => usePlannerStore.getState().updateHole('h-door', { flipY: true }));
    const flippedSwing = doorArc(container);
    expect(flippedSwing).not.toBe(flippedHinge);
  });
});
