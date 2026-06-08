import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ReferenceImageLayer } from './ReferenceImageLayer';
import { useReferenceImageStore } from '../../store/referenceImageStore';

beforeEach(() => useReferenceImageStore.getState().clear());

function renderLayer() {
  return render(
    <svg>
      <ReferenceImageLayer />
    </svg>,
  );
}

describe('ReferenceImageLayer', () => {
  it('renders nothing when no image is loaded', () => {
    const { container } = renderLayer();
    expect(container.querySelector('image')).toBeNull();
  });

  it('renders an <image> in world units with opacity + rotation', () => {
    const s = useReferenceImageStore.getState();
    s.setImage('data:img', 800, 600);
    s.setScale(2);
    s.setRotation(30);
    s.setOpacity(0.4);

    const { container } = renderLayer();
    const img = container.querySelector('image');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('href')).toBe('data:img');
    expect(img!.getAttribute('width')).toBe('1600'); // 800 * 2
    expect(img!.getAttribute('height')).toBe('1200'); // 600 * 2
    expect(img!.getAttribute('opacity')).toBe('0.4');
    expect(img!.getAttribute('transform')).toContain('rotate(30');
  });

  it('hides when not visible', () => {
    useReferenceImageStore.getState().setImage('data:img', 10, 10);
    useReferenceImageStore.getState().toggleVisible(); // → false
    const { container } = renderLayer();
    expect(container.querySelector('image')).toBeNull();
  });

  it('is click-through (pointer-events none) when locked', () => {
    useReferenceImageStore.getState().setImage('data:img', 10, 10);
    useReferenceImageStore.getState().toggleLock(); // → true
    const { container } = renderLayer();
    const img = container.querySelector('image') as SVGImageElement;
    expect(img.style.pointerEvents).toBe('none');
  });
});
