// Dimensions / measurement overlay — owned by Unit 7.
//
// Rooms are measured on the INSIDE, like real floor plans: each room wall shows
// the length of its inner face (from the room geometry), placed just inside the
// room. Walls that aren't part of a room fall back to their centerline length.
// Non-interactive: the group is pointer-events:none and nothing is selectable.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { midpoint, angleDegrees, pointsDistance } from '../../contract/geometry';
import { computeRoomsCached } from '../../utils/areaDetection';
import type { Point, Unit } from '../../contract/types';

/**
 * Format a length given in world units into a human-readable string.
 * For cm: render meters (e.g. `4.00 m`) when >= 100 cm, otherwise `40 cm`.
 * mm/in fall back to a sensible per-unit rendering.
 */
export function formatLength(value: number, unit: Unit): string {
  switch (unit) {
    case 'cm':
      return value >= 100 ? `${(value / 100).toFixed(2)} m` : `${Math.round(value)} cm`;
    case 'mm':
      return value >= 1000 ? `${(value / 1000).toFixed(2)} m` : `${Math.round(value)} mm`;
    case 'in':
      return value >= 12 ? `${(value / 12).toFixed(2)} ft` : `${Math.round(value)} in`;
    default:
      return `${Math.round(value)}`;
  }
}

interface LabelProps {
  pos: Point;
  angle: number;
  text: string;
  fontSize: number;
  forId: string;
}

function DimensionLabel({ pos, angle, text, fontSize, forId }: LabelProps) {
  const padX = fontSize * 0.3;
  const padY = fontSize * 0.15;
  const boxW = text.length * fontSize * 0.62 + padX * 2;
  const boxH = fontSize + padY * 2;
  // Flip so text always reads left-to-right.
  let a = angle;
  if (a > 90 && a < 270) a -= 180;
  return (
    <g data-dimension-for={forId} transform={`translate(${pos.x} ${pos.y}) rotate(${a})`}>
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
}

export function DimensionsLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const unit = usePlannerStore((s) => s.scene.meta.unit);
  const pixelsPerUnit = usePlannerStore((s) => s.scene.meta.pixelsPerUnit);
  const zoom = usePlannerStore((s) => s.zoom);

  // Keep the label a roughly constant screen size (~12px).
  const screenScale = pixelsPerUnit * zoom;
  const fontSize = screenScale > 0 ? 12 / screenScale : 12;
  const offset = fontSize * 0.9;

  const rooms = computeRoomsCached(layer);
  const roomLineIds = new Set<string>();
  for (const room of rooms) for (const w of room.walls) roomLineIds.add(w.lineId);

  return (
    <g data-layer="dimensions" style={{ pointerEvents: 'none' }}>
      {/* Inner measurements: each room wall's inner face, nudged into the room. */}
      {rooms.flatMap((room, ri) =>
        room.walls.map((w, wi) => {
          const innerA = w.quad[3];
          const innerB = w.quad[2];
          const length = pointsDistance(innerA, innerB);
          if (length <= 0) return null;
          const mid = midpoint(innerA, innerB);
          // Nudge the label from the inner edge toward the room centroid so it
          // sits just inside the wall.
          const toC = { x: room.centroid.x - mid.x, y: room.centroid.y - mid.y };
          const d = Math.hypot(toC.x, toC.y) || 1;
          const pos = { x: mid.x + (toC.x / d) * offset, y: mid.y + (toC.y / d) * offset };
          return (
            <DimensionLabel
              key={`room-${ri}-${wi}`}
              pos={pos}
              angle={angleDegrees(innerA, innerB)}
              text={formatLength(length, unit)}
              fontSize={fontSize}
              forId={w.lineId}
            />
          );
        }),
      )}

      {/* Open / non-room walls: centerline length, offset to one side. */}
      {Object.values(layer.lines)
        .filter((line) => !roomLineIds.has(line.id))
        .map((line) => {
          const a = layer.vertices[line.vertices[0]];
          const b = layer.vertices[line.vertices[1]];
          if (!a || !b) return null;
          const length = pointsDistance(a, b);
          if (length <= 0) return null;
          const mid = midpoint(a, b);
          const ux = (b.x - a.x) / length;
          const uy = (b.y - a.y) / length;
          const pos = { x: mid.x - uy * offset, y: mid.y + ux * offset };
          return (
            <DimensionLabel
              key={line.id}
              pos={pos}
              angle={angleDegrees(a, b)}
              text={formatLength(length, unit)}
              fontSize={fontSize}
              forId={line.id}
            />
          );
        })}
    </g>
  );
}
