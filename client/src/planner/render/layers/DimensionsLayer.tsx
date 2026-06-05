// Dimensions / measurement overlay — owned by Unit 7. Renders a length label at
// the midpoint of every wall, oriented along the wall, sized so it stays a
// roughly constant screen size regardless of zoom. Non-interactive: the group is
// pointer-events:none and nothing is tagged selectable.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { midpoint, angleDegrees, pointsDistance } from '../../contract/geometry';
import type { Unit } from '../../contract/types';

/**
 * Format a length given in world units into a human-readable string.
 * For cm: render meters (e.g. `4.00 m`) when >= 100 cm, otherwise `40 cm`.
 * mm/in fall back to a sensible per-unit rendering.
 */
export function formatLength(value: number, unit: Unit): string {
  switch (unit) {
    case 'cm':
      return value >= 100
        ? `${(value / 100).toFixed(2)} m`
        : `${Math.round(value)} cm`;
    case 'mm':
      return value >= 1000
        ? `${(value / 1000).toFixed(2)} m`
        : `${Math.round(value)} mm`;
    case 'in':
      return value >= 12
        ? `${(value / 12).toFixed(2)} ft`
        : `${Math.round(value)} in`;
    default:
      return `${Math.round(value)}`;
  }
}

export function DimensionsLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const unit = usePlannerStore((s) => s.scene.meta.unit);
  const pixelsPerUnit = usePlannerStore((s) => s.scene.meta.pixelsPerUnit);
  const zoom = usePlannerStore((s) => s.zoom);

  // Keep the label a roughly constant screen size (~12px) by scaling its size
  // inversely with the on-screen scale (pixelsPerUnit * zoom).
  const screenScale = pixelsPerUnit * zoom;
  const fontSize = screenScale > 0 ? 12 / screenScale : 12;
  // Lift the label slightly off the wall, along its normal, in world units.
  const offset = fontSize * 0.9;
  const padX = fontSize * 0.3;
  const padY = fontSize * 0.15;

  return (
    <g data-layer="dimensions" style={{ pointerEvents: 'none' }}>
      {Object.values(layer.lines).map((line) => {
        const a = layer.vertices[line.vertices[0]];
        const b = layer.vertices[line.vertices[1]];
        if (!a || !b) return null;

        const length = pointsDistance(a, b);
        if (length <= 0) return null;

        const mid = midpoint(a, b);
        const text = formatLength(length, unit);

        // Orient the label along the wall; flip when it would be upside down so
        // text always reads left-to-right.
        let angle = angleDegrees(a, b);
        if (angle > 90 && angle < 270) angle -= 180;

        // Approximate text box so the background halo fits the label.
        const boxW = text.length * fontSize * 0.62 + padX * 2;
        const boxH = fontSize + padY * 2;

        return (
          <g
            key={line.id}
            data-dimension-for={line.id}
            transform={`translate(${mid.x} ${mid.y}) rotate(${angle}) translate(0 ${-offset})`}
          >
            <rect
              x={-boxW / 2}
              y={-boxH / 2}
              width={boxW}
              height={boxH}
              rx={fontSize * 0.2}
              className="fill-card stroke-border"
              strokeWidth={fontSize * 0.06}
              opacity={0.85}
            />
            <text
              x={0}
              y={0}
              fontSize={fontSize}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {text}
            </text>
          </g>
        );
      })}
    </g>
  );
}
