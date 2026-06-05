// Walls layer — owned by Unit 2. Renders each wall as a filled polygon (via
// linePolygon) and fills every shared vertex with a small disc so corners and
// T-joints read as clean, continuous walls instead of mitered gaps.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { linePolygon } from '../../contract/geometry';
import type { Vertex } from '../../contract/types';

export function WallsLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const lines = Object.values(layer.lines);

  // Per-vertex max wall thickness, so joint discs match the thickest wall.
  const jointThickness: Record<string, number> = {};
  for (const line of lines) {
    for (const vId of line.vertices) {
      jointThickness[vId] = Math.max(jointThickness[vId] ?? 0, line.thickness);
    }
  }

  return (
    <g data-layer="walls">
      {/* Joint discs sit behind the wall bodies so corners stay filled. */}
      {Object.values(layer.vertices).map((v: Vertex) => {
        const t = jointThickness[v.id];
        if (!t) return null;
        return (
          <circle
            key={`joint-${v.id}`}
            cx={v.x}
            cy={v.y}
            r={t / 2}
            className="fill-foreground/80"
          />
        );
      })}

      {lines.map((line) => {
        const a = layer.vertices[line.vertices[0]];
        const b = layer.vertices[line.vertices[1]];
        if (!a || !b) return null;
        const points = linePolygon(a, b, line.thickness)
          .map((p) => `${p.x},${p.y}`)
          .join(' ');
        return (
          <polygon
            key={line.id}
            points={points}
            data-el-id={line.id}
            data-el-kind="lines"
            className="fill-foreground/80"
          />
        );
      })}
    </g>
  );
}
