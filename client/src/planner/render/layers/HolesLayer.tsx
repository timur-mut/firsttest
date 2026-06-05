// Holes (doors/windows) layer — owned by Unit 3. Renders, for each hole, the
// gap it cuts in the wall plus a glyph: a swing arc + leaf for doors, a thin
// double line across the opening for windows. Positions are derived from the
// hole's fractional offset along its wall.

import type { Hole, Vertex } from '../../contract/types';
import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { pointOnLine } from '../../contract/geometry';

interface HoleGeometry {
  /** Hole center in world coords. */
  cx: number;
  cy: number;
  /** Unit vector along the wall (vertices[0] -> vertices[1]). */
  dx: number;
  dy: number;
  /** Wall thickness. */
  thickness: number;
}

/** Resolve a hole's placement on its wall, or null if the wall is invalid. */
function holeGeometry(
  hole: Hole,
  vertices: Record<string, Vertex>,
  v0Id: string,
  v1Id: string,
  thickness: number,
): HoleGeometry | null {
  const v0 = vertices[v0Id];
  const v1 = vertices[v1Id];
  if (!v0 || !v1) return null;
  const len = Math.hypot(v1.x - v0.x, v1.y - v0.y);
  if (len <= 0) return null;
  const center = pointOnLine(v0, v1, hole.offset);
  return {
    cx: center.x,
    cy: center.y,
    dx: (v1.x - v0.x) / len,
    dy: (v1.y - v0.y) / len,
    thickness,
  };
}

function HoleGlyph({ hole, geo }: { hole: Hole; geo: HoleGeometry }) {
  const { cx, cy, dx, dy, thickness } = geo;
  const half = hole.width / 2;
  // Endpoints of the opening along the wall direction.
  const ax = cx - dx * half;
  const ay = cy - dy * half;
  const bx = cx + dx * half;
  const by = cy + dy * half;
  // Wall normal (perpendicular), used to span the wall thickness.
  const nx = -dy;
  const ny = dx;
  const ht = thickness / 2;

  // Gap: a rectangle covering the wall opening so the wall reads as cut.
  const gap = [
    `${ax + nx * ht},${ay + ny * ht}`,
    `${bx + nx * ht},${by + ny * ht}`,
    `${bx - nx * ht},${by - ny * ht}`,
    `${ax - nx * ht},${ay - ny * ht}`,
  ].join(' ');

  return (
    <g data-el-id={hole.id} data-el-kind="holes">
      {/* Clear the wall where the opening sits. */}
      <polygon points={gap} className="fill-background" />
      {/* Jambs: short ticks marking the opening edges. */}
      <line
        x1={ax + nx * ht}
        y1={ay + ny * ht}
        x2={ax - nx * ht}
        y2={ay - ny * ht}
        className="stroke-foreground"
        strokeWidth={2}
      />
      <line
        x1={bx + nx * ht}
        y1={by + ny * ht}
        x2={bx - nx * ht}
        y2={by - ny * ht}
        className="stroke-foreground"
        strokeWidth={2}
      />

      {hole.type === 'door' ? (
        <DoorGlyph
          hingeX={ax}
          hingeY={ay}
          leafX={bx}
          leafY={by}
          nx={nx}
          ny={ny}
          width={hole.width}
        />
      ) : (
        <WindowGlyph ax={ax} ay={ay} bx={bx} by={by} nx={nx} ny={ny} thickness={thickness} />
      )}
    </g>
  );
}

/** Door: a quarter-circle swing arc plus the leaf line, hinged at one jamb. */
function DoorGlyph({
  hingeX,
  hingeY,
  leafX,
  leafY,
  nx,
  ny,
  width,
}: {
  hingeX: number;
  hingeY: number;
  leafX: number;
  leafY: number;
  nx: number;
  ny: number;
  width: number;
}) {
  // The leaf swings from the far jamb to a point perpendicular off the hinge.
  const openX = hingeX + nx * width;
  const openY = hingeY + ny * width;
  // Sweep flag chosen so the arc bulges toward the open leaf side.
  const arc = `M ${leafX} ${leafY} A ${width} ${width} 0 0 1 ${openX} ${openY}`;
  return (
    <g>
      <path d={arc} className="fill-none stroke-foreground/60" strokeWidth={1.5} />
      <line
        x1={hingeX}
        y1={hingeY}
        x2={openX}
        y2={openY}
        className="stroke-foreground"
        strokeWidth={2}
      />
    </g>
  );
}

/** Window: a thin double line spanning the opening across the wall center. */
function WindowGlyph({
  ax,
  ay,
  bx,
  by,
  nx,
  ny,
  thickness,
}: {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  nx: number;
  ny: number;
  thickness: number;
}) {
  const off = thickness / 6;
  return (
    <g>
      <line
        x1={ax + nx * off}
        y1={ay + ny * off}
        x2={bx + nx * off}
        y2={by + ny * off}
        className="stroke-foreground"
        strokeWidth={1.5}
      />
      <line
        x1={ax - nx * off}
        y1={ay - ny * off}
        x2={bx - nx * off}
        y2={by - ny * off}
        className="stroke-foreground"
        strokeWidth={1.5}
      />
    </g>
  );
}

export function HolesLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  return (
    <g data-layer="holes">
      {Object.values(layer.holes).map((hole) => {
        const line = layer.lines[hole.lineId];
        if (!line) return null;
        const geo = holeGeometry(
          hole,
          layer.vertices,
          line.vertices[0],
          line.vertices[1],
          line.thickness,
        );
        if (!geo) return null;
        return <HoleGlyph key={hole.id} hole={hole} geo={geo} />;
      })}
    </g>
  );
}
