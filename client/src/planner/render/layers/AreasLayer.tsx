// Areas (rooms) layer — owned by Unit 4. Renders the INNER (floor) polygon of
// each room — i.e. the outer corners inset by the wall thickness — plus a label
// with the inner area (m²) and perimeter (m). Sits at the back (z-order).
//
// Geometry comes from computeRoomsCached (shared with the walls layer);
// id/color come from detectAreas (memoized) so colour overrides are preserved.

import { useMemo } from 'react';
import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { computeRoomsCached, detectAreas } from '../../utils/areaDetection';
import type { Unit } from '../../contract/types';

/** World-unit² -> m² conversion factor for a given scene unit. */
function unitToMetersSquared(unit: Unit): number {
  switch (unit) {
    case 'cm':
      return 1 / 10000;
    case 'mm':
      return 1 / 1_000_000;
    case 'in':
      return 0.00064516;
  }
}

/** World-unit -> m linear conversion factor for a given scene unit. */
function unitToMeters(unit: Unit): number {
  switch (unit) {
    case 'cm':
      return 1 / 100;
    case 'mm':
      return 1 / 1000;
    case 'in':
      return 0.0254;
  }
}

const cycleKey = (ids: string[]) => [...ids].sort().join('|');

export function AreasLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const unit = usePlannerStore((s) => s.scene.meta.unit);

  const areas = useMemo(() => detectAreas(layer), [layer.vertices, layer.lines]);
  const rooms = computeRoomsCached(layer);
  const roomByKey = new Map(rooms.map((r) => [cycleKey(r.cycle), r]));

  const toM2 = unitToMetersSquared(unit);
  const toM = unitToMeters(unit);

  return (
    <g data-layer="areas">
      {Object.values(areas).map((area) => {
        const room = roomByKey.get(cycleKey(area.vertices));
        if (!room || room.inner.length < 3) return null;
        const pointsAttr = room.inner.map((p) => `${p.x},${p.y}`).join(' ');
        const m2 = area.area * toM2;
        const perimM = room.perimeter * toM;
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
              x={room.centroid.x}
              y={room.centroid.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground/70"
              pointerEvents="none"
            >
              <tspan x={room.centroid.x} fontSize={24}>
                {m2.toFixed(2)} m²
              </tspan>
              <tspan x={room.centroid.x} dy={26} fontSize={16} className="fill-foreground/50">
                {perimM.toFixed(2)} m perimeter
              </tspan>
            </text>
          </g>
        );
      })}
    </g>
  );
}
