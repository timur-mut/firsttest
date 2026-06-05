// Selection highlight + handles — owned by Unit 7. Renders outlines and simple
// drag/rotate handles for the current typed selection. Rendered inside the
// Viewport's world-space transform group, so all coordinates are world units.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import { linePolygon } from '../../contract/geometry';
import { computeRoomsCached } from '../../utils/areaDetection';
import type { Point } from '../../contract/types';

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

  // Mitered wall quads keyed by line id, so a selected wall highlights its real
  // rendered shape (outer corner -> inner inset) rather than a centered box.
  const quadsByLine = new Map<string, Point[][]>();
  for (const room of computeRoomsCached(layer)) {
    for (const w of room.walls) {
      const list = quadsByLine.get(w.lineId) ?? [];
      list.push(w.quad);
      quadsByLine.set(w.lineId, list);
    }
  }

  return (
    <g data-layer="selection" pointerEvents="none">
      {/* Selected lines (walls): re-stroke their rendered shape. */}
      {selected.lines.map((id) => {
        const line = layer.lines[id];
        if (!line) return null;
        const quads = quadsByLine.get(id);
        if (quads && quads.length > 0) {
          return (
            <g key={`line-${id}`}>
              {quads.map((quad, qi) => (
                <polygon
                  key={qi}
                  points={quad.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={HIGHLIGHT}
                  strokeWidth={sw}
                />
              ))}
            </g>
          );
        }
        const a = layer.vertices[line.vertices[0]];
        const b = layer.vertices[line.vertices[1]];
        if (!a || !b) return null;
        const points = linePolygon(a, b, line.thickness)
          .map((p) => `${p.x},${p.y}`)
          .join(' ');
        return (
          <polygon key={`line-${id}`} points={points} fill="none" stroke={HIGHLIGHT} strokeWidth={sw} />
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
                {/* Corner resize handles: invisible larger grab target (tagged
                    so the select tool starts a resize) + the visible knob. */}
                {[
                  [-halfW, -halfD],
                  [halfW, -halfD],
                  [halfW, halfD],
                  [-halfW, halfD],
                ].map(([hx, hy], i) => (
                  <g key={i}>
                    <rect
                      x={hx - handle * 1.6}
                      y={hy - handle * 1.6}
                      width={handle * 3.2}
                      height={handle * 3.2}
                      fill="transparent"
                      pointerEvents="auto"
                      data-el-id={item.id}
                      data-el-kind="items"
                      data-handle="resize"
                      style={{ cursor: i % 2 === 0 ? 'nwse-resize' : 'nesw-resize' }}
                    />
                    <rect
                      x={hx - handle}
                      y={hy - handle}
                      width={handle * 2}
                      height={handle * 2}
                      fill="#fff"
                      stroke={HIGHLIGHT}
                      strokeWidth={sw}
                      pointerEvents="none"
                    />
                  </g>
                ))}
                {/* Rotate handle: stem above the top edge + knob. */}
                <line
                  x1={0}
                  y1={-halfD}
                  x2={0}
                  y2={-halfD - handle * 4}
                  stroke={HIGHLIGHT}
                  strokeWidth={sw}
                  pointerEvents="none"
                />
                {/* Invisible, larger grab target — re-enables pointer events
                    (the layer group has pointer-events: none) and is tagged so
                    the select tool starts a rotation gesture. */}
                <circle
                  cx={0}
                  cy={-halfD - handle * 4}
                  r={handle * 2}
                  fill="transparent"
                  pointerEvents="auto"
                  data-el-id={item.id}
                  data-el-kind="items"
                  data-handle="rotate"
                  style={{ cursor: 'grab' }}
                />
                <circle
                  cx={0}
                  cy={-halfD - handle * 4}
                  r={handle}
                  fill="#fff"
                  stroke={HIGHLIGHT}
                  strokeWidth={sw}
                  pointerEvents="none"
                />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
