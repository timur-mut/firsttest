// Viewport slice — owned by Unit 1 (Canvas viewport + grid).
//
// The foundation ships WORKING basics (setZoom/setPan/panBy/zoomAt/resetView)
// so the canvas can pan & zoom immediately. Unit 1 polishes: clamping by
// content, fitToContent, grid density vs. zoom, smooth zoom-to-cursor, etc.
//
// The Viewport (FROZEN, render/Viewport.tsx) and TopBar wire UI/gestures to
// these actions: wheel → zoomAt, middle-drag → panBy, the "Reset view" button →
// resetView, and a fit-to-content control → fitToContent. All mutations go
// through `mutate`; because zoom/pan are NOT part of `scene`, these viewport
// changes are intentionally NOT recorded as undo steps.

import { clamp, ZOOM_MAX, ZOOM_MIN } from '../../config';
import { getSelectedLayer } from '../helpers';
import type { Scene } from '../../contract/types';
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
  /** Reset zoom to 1 and center content (pan to origin if empty). */
  resetView(): void;
  /** Fit the drawn content into the given viewport size (Unit 1). */
  fitToContent(viewportWidth: number, viewportHeight: number): void;
}

/** Fraction of the viewport kept as empty margin around fitted content. */
const FIT_PADDING = 0.1;

/** Axis-aligned bounding box in world coordinates. */
interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Bounding box of all content in the selected layer, in world units, or `null`
 * when the layer is empty. Includes every vertex and each item's footprint.
 *
 * Item footprint uses a rotation-agnostic AABB: a square of side max(width,
 * depth) centered on the item. This always contains the true footprint for any
 * rotation, which is exactly what we want for framing.
 */
function contentBounds(scene: Scene): Bounds | null {
  const layer = getSelectedLayer(scene);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const v of Object.values(layer.vertices)) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }

  for (const item of Object.values(layer.items)) {
    const half = Math.max(item.width, item.depth) / 2;
    if (item.x - half < minX) minX = item.x - half;
    if (item.y - half < minY) minY = item.y - half;
    if (item.x + half > maxX) maxX = item.x + half;
    if (item.y + half > maxY) maxY = item.y + half;
  }

  if (minX === Infinity) return null; // no content
  return { minX, minY, maxX, maxY };
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
      const bounds = contentBounds(d.scene);
      if (!bounds) {
        d.pan = { x: 0, y: 0 };
        return;
      }
      // Keep zoom at 1 but center the content's bbox at the world origin so it
      // is visible regardless of where it sits in world space. The Viewport
      // does not pass its size to resetView, so we center on the origin (the
      // top-left-anchored fallback) rather than the viewport middle.
      const scale = d.scene.meta.pixelsPerUnit * d.zoom;
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      d.pan = { x: -cx * scale, y: -cy * scale };
    }),

  fitToContent: (viewportWidth, viewportHeight) =>
    mutate((d) => {
      const bounds = contentBounds(d.scene);
      if (!bounds) {
        d.zoom = 1;
        d.pan = { x: 0, y: 0 };
        return;
      }

      const ppu = d.scene.meta.pixelsPerUnit;
      const contentW = bounds.maxX - bounds.minX;
      const contentH = bounds.maxY - bounds.minY;

      // Usable area after reserving padding on every side.
      const usableW = viewportWidth * (1 - 2 * FIT_PADDING);
      const usableH = viewportHeight * (1 - 2 * FIT_PADDING);

      // Choose a zoom so the content (in screen px = world * ppu * zoom) fits
      // both axes. Guard against zero-size content (single point / single item).
      const zoomX = contentW > 0 ? usableW / (contentW * ppu) : ZOOM_MAX;
      const zoomY = contentH > 0 ? usableH / (contentH * ppu) : ZOOM_MAX;
      const zoom = clamp(Math.min(zoomX, zoomY), ZOOM_MIN, ZOOM_MAX);

      const scale = ppu * zoom;
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;

      // Map the bbox center to the viewport center: screen = world*scale + pan.
      d.zoom = zoom;
      d.pan = {
        x: viewportWidth / 2 - cx * scale,
        y: viewportHeight / 2 - cy * scale,
      };
    }),
});
