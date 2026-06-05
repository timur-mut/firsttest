// Viewport slice — owned by Unit 1 (Canvas viewport + grid).
//
// The foundation ships WORKING basics (setZoom/setPan/panBy/zoomAt/resetView)
// so the canvas can pan & zoom immediately. Unit 1 polishes: clamping by
// content, fitToContent, grid density vs. zoom, smooth zoom-to-cursor, etc.

import { clamp, ZOOM_MAX, ZOOM_MIN } from '../../config';
import type { SliceCreator } from '../storeTypes';

export interface ViewportSlice {
  /** Set absolute zoom (clamped). */
  setZoom(zoom: number): void;
  /** Set absolute pan (screen px). */
  setPan(x: number, y: number): void;
  /** Pan by a screen-pixel delta. */
  panBy(dx: number, dy: number): void;
  /** Multiply zoom by `factor`, keeping screen point (sx, sy) stationary. */
  zoomAt(factor: number, sx: number, sy: number): void;
  /** Reset zoom to 1 and pan to origin. */
  resetView(): void;
  /** Fit the drawn content into the given viewport size (Unit 1). */
  fitToContent(viewportWidth: number, viewportHeight: number): void;
}

export const createViewportSlice: SliceCreator<ViewportSlice> = (mutate) => ({
  setZoom: (zoom) =>
    mutate((d) => {
      d.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    }),

  setPan: (x, y) =>
    mutate((d) => {
      d.pan = { x, y };
    }),

  panBy: (dx, dy) =>
    mutate((d) => {
      d.pan = { x: d.pan.x + dx, y: d.pan.y + dy };
    }),

  zoomAt: (factor, sx, sy) =>
    mutate((d) => {
      const scale = d.scene.meta.pixelsPerUnit * d.zoom;
      const wx = (sx - d.pan.x) / scale;
      const wy = (sy - d.pan.y) / scale;
      const nextZoom = clamp(d.zoom * factor, ZOOM_MIN, ZOOM_MAX);
      const nextScale = d.scene.meta.pixelsPerUnit * nextZoom;
      d.zoom = nextZoom;
      d.pan = { x: sx - wx * nextScale, y: sy - wy * nextScale };
    }),

  resetView: () =>
    mutate((d) => {
      d.zoom = 1;
      d.pan = { x: 0, y: 0 };
    }),

  // STUB (Unit 1): compute a zoom+pan that frames all content.
  fitToContent: (_viewportWidth, _viewportHeight) => {},
});
