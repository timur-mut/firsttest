// Walls layer — owned by Unit 2. Foundation ships a minimal renderer so walls
// are visible immediately; Unit 2 replaces it (joints, selection hit-areas, …).

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { linePolygon } from '../../contract/geometry';

export function WallsLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  return (
    <g data-layer="walls">
      {Object.values(layer.lines).map((line) => {
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
