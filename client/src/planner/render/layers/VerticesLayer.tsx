// Corner (vertex) handles. Renders a small grabbable dot at every vertex so
// corners can be selected and dragged with the Select tool. The invisible
// larger circle is the hit target; the small dot is the visible affordance.
// Sits above items so handles stay grabbable; the selection ring (Selection
// layer) draws on top to show which corner is selected.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';

export function VerticesLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const scale = usePlannerStore((s) => s.scene.meta.pixelsPerUnit * s.zoom);

  // Sizes are in world units; divide by scale so they stay ~constant on screen.
  const hit = 9 / scale; // invisible grab radius (~9px)
  const dot = 3.5 / scale; // visible handle radius
  const sw = 1.5 / scale;

  return (
    <g data-layer="vertices">
      {Object.values(layer.vertices).map((v) => (
        <g key={v.id}>
          <circle
            cx={v.x}
            cy={v.y}
            r={hit}
            fill="transparent"
            data-el-id={v.id}
            data-el-kind="vertices"
            style={{ cursor: 'move' }}
          />
          <circle
            cx={v.x}
            cy={v.y}
            r={dot}
            strokeWidth={sw}
            pointerEvents="none"
            className="fill-background stroke-foreground/60"
          />
        </g>
      ))}
    </g>
  );
}
