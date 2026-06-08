// Reference-image underlay state. A user-uploaded floor-plan image shown behind
// the scene geometry for manual tracing/fine-tuning. Kept in a STANDALONE store
// (like panels/panelStore) — it is NOT part of `scene`, so it is excluded from
// undo/redo and from the frozen scene-serialization contract. It is persisted
// separately, as a sibling field on the saved plan (see persistence/api.ts).
import { create } from 'zustand';
import { usePlannerStore } from './index';

/** The serializable reference-image state (everything except the actions). */
export interface ReferenceImage {
  /** Image data URL, or null when no image is loaded. */
  src: string | null;
  /** Natural pixel size of the source bitmap. */
  naturalWidth: number;
  naturalHeight: number;
  /** Top-left position in world units (cm). */
  x: number;
  y: number;
  /** World units (cm) per source pixel. */
  scale: number;
  /** Rotation in degrees, about the image center. */
  rotation: number;
  /** 0..1 */
  opacity: number;
  visible: boolean;
  /** When locked, the image ignores pointer events (edit geometry through it). */
  locked: boolean;
}

interface ReferenceImageState extends ReferenceImage {
  setImage(src: string, naturalWidth: number, naturalHeight: number): void;
  clear(): void;
  setOpacity(opacity: number): void;
  setScale(scale: number): void;
  setRotation(rotation: number): void;
  setPosition(x: number, y: number): void;
  /** Translate by a world-space delta (used by drag-to-move). */
  move(dx: number, dy: number): void;
  toggleVisible(): void;
  toggleLock(): void;
  /** Replace the whole serializable state (used when loading a plan). */
  hydrate(state: ReferenceImage | null): void;
}

const EMPTY: ReferenceImage = {
  src: null,
  naturalWidth: 0,
  naturalHeight: 0,
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 0.5,
  visible: true,
  locked: false,
};

/** World point currently under the top-left of the canvas, for default placement. */
function viewTopLeftWorld(): { x: number; y: number } {
  const s = usePlannerStore.getState();
  const scale = s.scene.meta.pixelsPerUnit * s.zoom;
  // `|| 0` collapses -0 (and any NaN) to 0 for clean stored coordinates.
  return { x: -s.pan.x / scale || 0, y: -s.pan.y / scale || 0 };
}

export const useReferenceImageStore = create<ReferenceImageState>((set) => ({
  ...EMPTY,

  setImage: (src, naturalWidth, naturalHeight) => {
    const { x, y } = viewTopLeftWorld();
    set({ ...EMPTY, src, naturalWidth, naturalHeight, x, y });
  },

  clear: () => set({ ...EMPTY }),

  setOpacity: (opacity) => set({ opacity: Math.max(0, Math.min(1, opacity)) }),
  setScale: (scale) => set({ scale: scale > 0 ? scale : 0.001 }),
  setRotation: (rotation) => set({ rotation }),
  setPosition: (x, y) => set({ x, y }),
  move: (dx, dy) => set((s) => ({ x: s.x + dx, y: s.y + dy })),
  toggleVisible: () => set((s) => ({ visible: !s.visible })),
  toggleLock: () => set((s) => ({ locked: !s.locked })),

  hydrate: (state) => set(state ? { ...EMPTY, ...state } : { ...EMPTY }),
}));

/** Snapshot of just the serializable fields (for saving with the plan). */
export function referenceImageSnapshot(): ReferenceImage | null {
  const s = useReferenceImageStore.getState();
  if (!s.src) return null;
  return {
    src: s.src,
    naturalWidth: s.naturalWidth,
    naturalHeight: s.naturalHeight,
    x: s.x,
    y: s.y,
    scale: s.scale,
    rotation: s.rotation,
    opacity: s.opacity,
    visible: s.visible,
    locked: s.locked,
  };
}
