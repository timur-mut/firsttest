// Reference-image underlay layer. Renders the user-uploaded floor-plan image as
// an SVG <image> at the BACK of the scene (mounted first in SceneRenderer), in
// world coordinates so it pans/zooms with everything. When unlocked it handles
// its own drag-to-move (stopping propagation so the frozen Viewport's pointer
// dispatch is bypassed); when locked it is click-through so geometry above can
// be edited over it.

import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { usePlannerStore } from '../../store';
import { useReferenceImageStore } from '../../store/referenceImageStore';

export function ReferenceImageLayer() {
  const src = useReferenceImageStore((s) => s.src);
  const visible = useReferenceImageStore((s) => s.visible);
  const locked = useReferenceImageStore((s) => s.locked);
  const x = useReferenceImageStore((s) => s.x);
  const y = useReferenceImageStore((s) => s.y);
  const naturalWidth = useReferenceImageStore((s) => s.naturalWidth);
  const naturalHeight = useReferenceImageStore((s) => s.naturalHeight);
  const scale = useReferenceImageStore((s) => s.scale);
  const rotation = useReferenceImageStore((s) => s.rotation);
  const opacity = useReferenceImageStore((s) => s.opacity);

  const drag = useRef<{ sx: number; sy: number } | null>(null);

  if (!src || !visible) return null;

  const w = naturalWidth * scale;
  const h = naturalHeight * scale;
  const cx = x + w / 2;
  const cy = y + h / 2;

  function screenScale(): number {
    const s = usePlannerStore.getState();
    return s.scene.meta.pixelsPerUnit * s.zoom;
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (locked || e.button !== 0) return;
    if (usePlannerStore.getState().mode === 'panning') return; // let the Viewport pan
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY };
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag.current) return;
    e.stopPropagation();
    const s = screenScale();
    const dx = (e.clientX - drag.current.sx) / s;
    const dy = (e.clientY - drag.current.sy) / s;
    drag.current = { sx: e.clientX, sy: e.clientY };
    useReferenceImageStore.getState().move(dx, dy);
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (!drag.current) return;
    e.stopPropagation();
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
  }

  return (
    <g data-layer="reference-image">
      <image
        href={src}
        x={x}
        y={y}
        width={w}
        height={h}
        opacity={opacity}
        transform={`rotate(${rotation} ${cx} ${cy})`}
        preserveAspectRatio="none"
        style={{ pointerEvents: locked ? 'none' : 'auto', cursor: 'move' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </g>
  );
}
