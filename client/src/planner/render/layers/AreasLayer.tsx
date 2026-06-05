// Areas (rooms) layer — owned by Unit 4. Renders filled room polygons + area
// labels (m²). Sits at the back (z-order).
//
// To stay independent of the store's derived areas (and avoid polluting undo
// history), rooms are COMPUTED for rendering via detectAreas() inside a useMemo
// keyed on the layer's vertices + lines. The layer never mutates the store.

import { useMemo } from 'react';
import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { detectAreas } from '../../utils/areaDetection';
import { polygonCentroid } from '../../contract/geometry';
import type { Point, Unit } from '../../contract/types';

/** World-unit² -> m² conversion factor for a given scene unit. */
function unitToMetersSquared(unit: Unit): number {
  switch (unit) {
    case 'cm':
      return 1 / 10000; // 100 cm per m -> 10000 cm² per m²
    case 'mm':
      return 1 / 1_000_000; // 1000 mm per m -> 1e6 mm² per m²
    case 'in':
      return 0.00064516; // 1 in² = 0.00064516 m²
  }
}

export function AreasLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const unit = usePlannerStore((s) => s.scene.meta.unit);

  const areas = useMemo(
    () => detectAreas(layer),
    // Recompute only when the wall graph changes.
    [layer.vertices, layer.lines],
  );

  const toM2 = unitToMetersSquared(unit);

  return (
    <g data-layer="areas">
      {Object.values(areas).map((area) => {
        const points: Point[] = area.vertices.map((id) => {
          const v = layer.vertices[id];
          return { x: v.x, y: v.y };
        });
        const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');
        const centroid = polygonCentroid(points);
        const m2 = area.area * toM2;
        return (
          <g key={area.id} data-el-id={area.id} data-el-kind="areas">
            <polygon
              points={pointsAttr}
              fill={area.color}
              fillOpacity={0.65}
              data-el-id={area.id}
              data-el-kind="areas"
            />
            <text
              x={centroid.x}
              y={centroid.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground/70"
              fontSize={24}
              pointerEvents="none"
            >
              {m2.toFixed(2)} m²
            </text>
          </g>
        );
      })}
    </g>
  );
}
