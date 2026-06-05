// Draft overlay — owned by Unit 2. Renders the in-progress wall chain while
// drawing: the committed segments, a live preview segment to the cursor, and a
// small snap indicator at the active point.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import type { Point } from '../../contract/types';

export function DraftLayer() {
  const draft = usePlannerStore((s) => s.wallDraft);
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  if (!draft || draft.vertices.length === 0) return null;

  // Resolve committed chain vertices to points (skip any that vanished).
  const points: Point[] = [];
  for (const vId of draft.vertices) {
    const v = layer.vertices[vId];
    if (v) points.push({ x: v.x, y: v.y });
  }
  if (points.length === 0) return null;

  const last = points[points.length - 1];
  const preview = draft.preview;

  const chainPath =
    points.length > 1 ? `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}` : '';

  return (
    <g data-layer="wall-draft" className="pointer-events-none">
      {/* Committed segments of the current chain. */}
      {chainPath && (
        <path
          d={chainPath}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Live preview segment from the last committed point to the cursor. */}
      {preview && (
        <line
          x1={last.x}
          y1={last.y}
          x2={preview.x}
          y2={preview.y}
          className="stroke-primary"
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Markers for committed chain points. */}
      {points.map((p, i) => (
        <circle
          key={`pt-${i}`}
          cx={p.x}
          cy={p.y}
          r={4}
          className="fill-primary"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Snap indicator at the active (preview) point. */}
      {preview && (
        <circle
          cx={preview.x}
          cy={preview.y}
          r={5}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}
