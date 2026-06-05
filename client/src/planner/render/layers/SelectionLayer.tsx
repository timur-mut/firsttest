// Selection highlight + handles — owned by Unit 7. Renders outlines and simple
// drag/rotate handles for the current typed selection. Rendered inside the
// Viewport's world-space transform group, so all coordinates are world units.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { linePolygon } from '../../contract/geometry';

// Stroke widths are in world units; divide by scale so they stay ~constant on
// screen regardless of zoom.
const HIGHLIGHT = '#3b82f6';

export function SelectionLayer() {
  const selected = usePlannerStore((s) => s.selected);
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  const scale = usePlannerStore((s) => s.scene.meta.pixelsPerUnit * s.zoom);

  const sw = 2 / scale; // ~2px outline
  const handle = 5 / scale; // ~5px handle radius

  const selectedItems = selected.items
    .map((id) => layer.items[id])
    .filter((it): it is NonNullable<typeof it> => Boolean(it));

  return (
    <g data-layer="selection" pointerEvents="none">
      {/* Selected lines (walls): re-stroke their polygon. */}
      {selected.lines.map((id) => {
        const line = layer.lines[id];
        if (!line) return null;
        const a = layer.vertices[line.vertices[0]];
        const b = layer.vertices[line.vertices[1]];
        if (!a || !b) return null;
        const points = linePolygon(a, b, line.thickness)
          .map((p) => `${p.x},${p.y}`)
          .join(' ');
        return (
          <polygon
            key={`line-${id}`}
            points={points}
            fill="none"
            stroke={HIGHLIGHT}
            strokeWidth={sw}
          />
        );
      })}

      {/* Selected vertices: small ring. */}
      {selected.vertices.map((id) => {
        const v = layer.vertices[id];
        if (!v) return null;
        return (
          <circle
            key={`vtx-${id}`}
            cx={v.x}
            cy={v.y}
            r={handle}
            fill="#fff"
            stroke={HIGHLIGHT}
            strokeWidth={sw}
          />
        );
      })}

      {/* Selected holes: highlight at the hole's position along its line. */}
      {selected.holes.map((id) => {
        const hole = layer.holes[id];
        if (!hole) return null;
        const line = layer.lines[hole.lineId];
        if (!line) return null;
        const a = layer.vertices[line.vertices[0]];
        const b = layer.vertices[line.vertices[1]];
        if (!a || !b) return null;
        const cx = a.x + (b.x - a.x) * hole.offset;
        const cy = a.y + (b.y - a.y) * hole.offset;
        return (
          <circle
            key={`hole-${id}`}
            cx={cx}
            cy={cy}
            r={Math.max(hole.width / 2, handle)}
            fill="none"
            stroke={HIGHLIGHT}
            strokeWidth={sw}
          />
        );
      })}

      {/* Selected items: rotated bounding outline + handles for a single item. */}
      {selectedItems.map((item) => {
        const halfW = item.width / 2;
        const halfD = item.depth / 2;
        const single = selectedItems.length === 1;
        return (
          <g
            key={`item-${item.id}`}
            transform={`translate(${item.x},${item.y}) rotate(${item.rotation})`}
          >
            <rect
              x={-halfW}
              y={-halfD}
              width={item.width}
              height={item.depth}
              fill="none"
              stroke={HIGHLIGHT}
              strokeWidth={sw}
            />
            {single && (
              <>
                {/* Corner drag handles. */}
                {[
                  [-halfW, -halfD],
                  [halfW, -halfD],
                  [halfW, halfD],
                  [-halfW, halfD],
                ].map(([hx, hy], i) => (
                  <rect
                    key={i}
                    x={hx - handle}
                    y={hy - handle}
                    width={handle * 2}
                    height={handle * 2}
                    fill="#fff"
                    stroke={HIGHLIGHT}
                    strokeWidth={sw}
                  />
                ))}
                {/* Rotate handle: stem above the top edge + knob. */}
                <line
                  x1={0}
                  y1={-halfD}
                  x2={0}
                  y2={-halfD - handle * 4}
                  stroke={HIGHLIGHT}
                  strokeWidth={sw}
                />
                <circle
                  cx={0}
                  cy={-halfD - handle * 4}
                  r={handle}
                  fill="#fff"
                  stroke={HIGHLIGHT}
                  strokeWidth={sw}
                />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
