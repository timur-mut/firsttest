// ─────────────────────────────────────────────────────────────────────────────
// Viewport — FROZEN, foundation-owned. The SVG canvas root.
//
// Responsibilities:
//  • render an SVG that fills its container, with a pan/zoom transform group
//  • draw the background grid (in screen space, so it stays crisp)
//  • convert pointer events into world coordinates + a snapped point
//  • dispatch pointer events to the ACTIVE tool's handlers (via the registry)
//  • handle middle-button / space-drag panning and wheel zoom directly
//
// Workers never edit this file. Tools receive `PlannerPointerEvent`s; layers
// render scene data. Unit 1 enhances behavior via the viewport SLICE, not here.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react';
import { usePlannerStore } from '../store';
import { getSelectedLayer } from '../store/helpers';
import { snapPoint } from '../contract/snapping';
import type { PrototypeKind } from '../contract/types';
import type { PlannerPointerEvent } from '../contract/toolTypes';
import { ITEM_DRAG_MIME, type ItemDragPayload } from '../contract/catalogTypes';
import { toolForMode } from '../tools/registry';
import { GRID_SIZE, SNAP_RADIUS_PX } from '../config';
import { SceneRenderer } from './SceneRenderer';

interface Size {
  width: number;
  height: number;
}

export function Viewport() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const panDrag = useRef<{ x: number; y: number } | null>(null);

  const zoom = usePlannerStore((s) => s.zoom);
  const pan = usePlannerStore((s) => s.pan);
  const meta = usePlannerStore((s) => s.scene.meta);
  const mode = usePlannerStore((s) => s.mode);
  const scale = meta.pixelsPerUnit * zoom;

  // Track the rendered size so the grid covers the whole viewport.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function clientToScreen(e: { clientX: number; clientY: number }): { sx: number; sy: number } {
    const rect = svgRef.current?.getBoundingClientRect();
    return { sx: e.clientX - (rect?.left ?? 0), sy: e.clientY - (rect?.top ?? 0) };
  }

  function screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const state = usePlannerStore.getState();
    const s = state.scene.meta.pixelsPerUnit * state.zoom;
    return { x: (sx - state.pan.x) / s, y: (sy - state.pan.y) / s };
  }

  // Catalog -> canvas drag-drop. The catalog (Unit 5) sets an ItemDragPayload;
  // we convert to world coordinates and call addItem (Unit 5/6 implements it).
  function onDragOver(e: ReactDragEvent) {
    if (e.dataTransfer.types.includes(ITEM_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function onDrop(e: ReactDragEvent) {
    const raw = e.dataTransfer.getData(ITEM_DRAG_MIME);
    if (!raw) return;
    e.preventDefault();
    try {
      const payload = JSON.parse(raw) as ItemDragPayload;
      const { sx, sy } = clientToScreen(e);
      const { x, y } = screenToWorld(sx, sy);
      usePlannerStore.getState().addItem(
        { type: payload.type, width: payload.defaultWidth, depth: payload.defaultDepth, color: payload.color },
        x,
        y,
      );
    } catch {
      // ignore malformed payloads
    }
  }

  function buildPointerEvent(e: ReactPointerEvent): PlannerPointerEvent {
    const { sx, sy } = clientToScreen(e);
    const state = usePlannerStore.getState();
    const s = state.scene.meta.pixelsPerUnit * state.zoom;
    const x = (sx - state.pan.x) / s;
    const y = (sy - state.pan.y) / s;

    const layer = getSelectedLayer(state.scene);
    const snapped = snapPoint(
      { x, y },
      {
        vertices: layer.vertices,
        lines: layer.lines,
        gridSize: GRID_SIZE,
        radius: SNAP_RADIUS_PX / s,
        mask: state.snapMask,
      },
    );

    const targetEl = (e.target as Element | null)?.closest('[data-el-id]') as HTMLElement | null;
    return {
      x,
      y,
      snappedX: snapped.x,
      snappedY: snapped.y,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey || e.metaKey,
      targetId: targetEl?.dataset.elId,
      targetKind: targetEl?.dataset.elKind as PrototypeKind | undefined,
      handle: targetEl?.dataset.handle,
      originalEvent: e,
    };
  }

  function onPointerDown(e: ReactPointerEvent) {
    // Middle button (or space-drag, handled via mode) → pan.
    if (e.button === 1 || usePlannerStore.getState().mode === 'panning') {
      panDrag.current = { x: e.clientX, y: e.clientY };
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    toolForMode(usePlannerStore.getState().mode)?.handlers?.onPointerDown?.(buildPointerEvent(e));
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (panDrag.current) {
      const dx = e.clientX - panDrag.current.x;
      const dy = e.clientY - panDrag.current.y;
      panDrag.current = { x: e.clientX, y: e.clientY };
      usePlannerStore.getState().panBy(dx, dy);
      return;
    }
    toolForMode(usePlannerStore.getState().mode)?.handlers?.onPointerMove?.(buildPointerEvent(e));
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (panDrag.current) {
      panDrag.current = null;
      svgRef.current?.releasePointerCapture(e.pointerId);
      return;
    }
    toolForMode(usePlannerStore.getState().mode)?.handlers?.onPointerUp?.(buildPointerEvent(e));
  }

  function onWheel(e: WheelEvent) {
    const { sx, sy } = clientToScreen(e);
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    usePlannerStore.getState().zoomAt(factor, sx, sy);
  }

  // Grid sizing in screen space: pattern tile = grid * scale, scrolled by pan.
  const tile = GRID_SIZE * scale;
  const major = tile * 5;
  const activeTool = toolForMode(mode);

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-muted/30">
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ cursor: activeTool?.cursor ?? 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <defs>
          {tile > 4 && (
            <pattern
              id="planner-grid-minor"
              width={tile}
              height={tile}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % tile} ${pan.y % tile})`}
            >
              <path d={`M ${tile} 0 L 0 0 0 ${tile}`} fill="none" className="stroke-border" strokeWidth={1} />
            </pattern>
          )}
          {major > 4 && (
            <pattern
              id="planner-grid-major"
              width={major}
              height={major}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % major} ${pan.y % major})`}
            >
              <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" className="stroke-border" strokeWidth={1.5} opacity={0.6} />
            </pattern>
          )}
        </defs>

        {tile > 4 && <rect width={size.width} height={size.height} fill="url(#planner-grid-minor)" />}
        {major > 4 && <rect width={size.width} height={size.height} fill="url(#planner-grid-major)" />}

        <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
          <SceneRenderer />
        </g>
      </svg>
    </div>
  );
}
