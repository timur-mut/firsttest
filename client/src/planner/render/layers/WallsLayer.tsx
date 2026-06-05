// Walls layer — owned by Unit 2.
//
// Vertices are the OUTER corners of a room; each wall extends INWARD by its
// thickness. Room walls render as mitered trapezoids (computed once per layer
// via computeRoomsCached), so corners meet cleanly at the outer/inner corner
// points with no gaps. Walls that aren't part of any room (open chains) fall
// back to a centered rectangle plus joint discs.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { linePolygon } from '../../contract/geometry';
import { computeRoomsCached } from '../../utils/areaDetection';
import type { Vertex } from '../../contract/types';

const pointsAttr = (pts: { x: number; y: number }[]) =>
  pts.map((p) => `${p.x},${p.y}`).join(' ');

export function WallsLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const rooms = computeRoomsCached(layer);

  // Walls that belong to at least one room render as mitered trapezoids.
  const roomLineIds = new Set<string>();
  for (const room of rooms) for (const w of room.walls) roomLineIds.add(w.lineId);

  // Remaining (open) walls fall back to centered rectangles + joint discs.
  const fallbackLines = Object.values(layer.lines).filter((l) => !roomLineIds.has(l.id));
  const jointThickness: Record<string, number> = {};
  for (const line of fallbackLines) {
    for (const vId of line.vertices) {
      jointThickness[vId] = Math.max(jointThickness[vId] ?? 0, line.thickness);
    }
  }

  return (
    <g data-layer="walls">
      {/* Joint discs (fallback walls only) sit behind the wall bodies. */}
      {Object.values(layer.vertices).map((v: Vertex) => {
        const t = jointThickness[v.id];
        if (!t) return null;
        return <circle key={`joint-${v.id}`} cx={v.x} cy={v.y} r={t / 2} className="fill-foreground/80" />;
      })}

      {/* Mitered room walls (outer corner -> inner inset). */}
      {rooms.flatMap((room, ri) =>
        room.walls.map((w, wi) => (
          <polygon
            key={`room-${ri}-${wi}`}
            points={pointsAttr(w.quad)}
            data-el-id={w.lineId}
            data-el-kind="lines"
            className="fill-foreground/80"
          />
        )),
      )}

      {/* Open / non-room walls: centered rectangle. */}
      {fallbackLines.map((line) => {
        const a = layer.vertices[line.vertices[0]];
        const b = layer.vertices[line.vertices[1]];
        if (!a || !b) return null;
        return (
          <polygon
            key={line.id}
            points={pointsAttr(linePolygon(a, b, line.thickness))}
            data-el-id={line.id}
            data-el-kind="lines"
            className="fill-foreground/80"
          />
        );
      })}
    </g>
  );
}
