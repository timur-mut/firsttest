import { describe, it, expect, beforeEach } from 'vitest';
import { useReferenceImageStore, referenceImageSnapshot } from './referenceImageStore';
import { usePlannerStore } from './index';

beforeEach(() => {
  useReferenceImageStore.getState().clear();
  usePlannerStore.getState().setZoom(1);
  usePlannerStore.getState().setPan(0, 0);
});

describe('referenceImageStore', () => {
  it('setImage stores src/size with sensible defaults', () => {
    useReferenceImageStore.getState().setImage('data:img', 800, 600);
    const s = useReferenceImageStore.getState();
    expect(s.src).toBe('data:img');
    expect(s.naturalWidth).toBe(800);
    expect(s.naturalHeight).toBe(600);
    expect(s.scale).toBe(1);
    expect(s.opacity).toBe(0.5);
    expect(s.visible).toBe(true);
    expect(s.locked).toBe(false);
    expect(s.x).toBe(0); // pan 0, zoom 1 → top-left at world origin
    expect(s.y).toBe(0);
  });

  it('places the image top-left at the current view (accounts for pan/zoom)', () => {
    usePlannerStore.getState().setPan(100, 50);
    usePlannerStore.getState().setZoom(2); // scale = ppu(1) * 2
    useReferenceImageStore.getState().setImage('data:img', 10, 10);
    const s = useReferenceImageStore.getState();
    expect(s.x).toBe(-50); // -pan.x / scale = -100 / 2
    expect(s.y).toBe(-25);
  });

  it('move() translates in world units', () => {
    useReferenceImageStore.getState().setImage('data:img', 10, 10);
    useReferenceImageStore.getState().setPosition(0, 0);
    useReferenceImageStore.getState().move(10, -5);
    expect(useReferenceImageStore.getState().x).toBe(10);
    expect(useReferenceImageStore.getState().y).toBe(-5);
  });

  it('setScale/setRotation/setOpacity set and clamp', () => {
    const a = useReferenceImageStore.getState();
    a.setScale(2);
    expect(useReferenceImageStore.getState().scale).toBe(2);
    a.setScale(-1);
    expect(useReferenceImageStore.getState().scale).toBeGreaterThan(0); // clamped to >0
    a.setRotation(45);
    expect(useReferenceImageStore.getState().rotation).toBe(45);
    a.setOpacity(2);
    expect(useReferenceImageStore.getState().opacity).toBe(1); // clamped
    a.setOpacity(-1);
    expect(useReferenceImageStore.getState().opacity).toBe(0);
  });

  it('toggleVisible/toggleLock flip booleans', () => {
    const a = useReferenceImageStore.getState();
    a.toggleVisible();
    expect(useReferenceImageStore.getState().visible).toBe(false);
    a.toggleLock();
    expect(useReferenceImageStore.getState().locked).toBe(true);
  });

  it('snapshot is null without an image, and clear() resets', () => {
    expect(referenceImageSnapshot()).toBeNull();
    useReferenceImageStore.getState().setImage('data:img', 1, 1);
    expect(referenceImageSnapshot()).toMatchObject({ src: 'data:img' });
    useReferenceImageStore.getState().clear();
    expect(useReferenceImageStore.getState().src).toBeNull();
    expect(referenceImageSnapshot()).toBeNull();
  });

  it('hydrate replaces the whole state', () => {
    useReferenceImageStore.getState().hydrate({
      src: 'data:hydrated',
      naturalWidth: 4,
      naturalHeight: 3,
      x: 1,
      y: 2,
      scale: 0.5,
      rotation: 90,
      opacity: 0.8,
      visible: false,
      locked: true,
    });
    const s = useReferenceImageStore.getState();
    expect(s.src).toBe('data:hydrated');
    expect(s.rotation).toBe(90);
    expect(s.locked).toBe(true);
    useReferenceImageStore.getState().hydrate(null);
    expect(useReferenceImageStore.getState().src).toBeNull();
  });
});
