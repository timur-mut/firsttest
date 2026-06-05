// Items (furniture) layer — owned by Unit 6. Renders each item as a group
// `translate(x,y) rotate(rotation)` so rotation pivots around the item center.
// A handful of prototypes get a nicer glyph (bed, sofa, table, chair); anything
// else falls back to a rounded rectangle in the item's color.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';
import type { Item } from '../../contract/types';

const FALLBACK_COLOR = '#94a3b8';

/** Slightly darken a hex color for outlines/details (best-effort). */
function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function ItemGlyph({ item }: { item: Item }) {
  const color = (item.properties.color as string | undefined) ?? FALLBACK_COLOR;
  const w = item.width;
  const d = item.depth;
  const left = -w / 2;
  const top = -d / 2;
  const detail = shade(color, -40);

  switch (item.type) {
    case 'sofa': {
      const armW = Math.min(w * 0.16, 20);
      const backD = Math.min(d * 0.25, 18);
      return (
        <g>
          {/* base */}
          <rect x={left} y={top} width={w} height={d} rx={8} fill={color} opacity={0.9} />
          {/* backrest along the top edge */}
          <rect x={left} y={top} width={w} height={backD} rx={6} fill={detail} opacity={0.6} />
          {/* arms */}
          <rect x={left} y={top} width={armW} height={d} rx={6} fill={detail} opacity={0.6} />
          <rect x={left + w - armW} y={top} width={armW} height={d} rx={6} fill={detail} opacity={0.6} />
          <rect x={left} y={top} width={w} height={d} rx={8} fill="none" stroke={detail} strokeWidth={1.5} />
        </g>
      );
    }
    case 'bed': {
      const pillowD = Math.min(d * 0.22, 28);
      const pillowGap = w * 0.06;
      const pillowW = (w - pillowGap * 3) / 2;
      return (
        <g>
          <rect x={left} y={top} width={w} height={d} rx={6} fill={color} opacity={0.9} />
          {/* headboard along the top edge */}
          <rect x={left} y={top} width={w} height={Math.min(d * 0.08, 10)} fill={detail} opacity={0.7} />
          {/* two pillows near the head */}
          <rect x={left + pillowGap} y={top + Math.min(d * 0.1, 12)} width={pillowW} height={pillowD} rx={4} fill="#ffffff" opacity={0.75} />
          <rect x={left + pillowGap * 2 + pillowW} y={top + Math.min(d * 0.1, 12)} width={pillowW} height={pillowD} rx={4} fill="#ffffff" opacity={0.75} />
          <rect x={left} y={top} width={w} height={d} rx={6} fill="none" stroke={detail} strokeWidth={1.5} />
        </g>
      );
    }
    case 'table':
    case 'desk': {
      return (
        <g>
          <rect x={left} y={top} width={w} height={d} rx={4} fill={color} opacity={0.85} />
          {/* inset to suggest a tabletop */}
          <rect
            x={left + w * 0.08}
            y={top + d * 0.08}
            width={w * 0.84}
            height={d * 0.84}
            rx={3}
            fill="none"
            stroke={detail}
            strokeWidth={1.25}
            opacity={0.7}
          />
          <rect x={left} y={top} width={w} height={d} rx={4} fill="none" stroke={detail} strokeWidth={1.5} />
        </g>
      );
    }
    case 'chair': {
      const backD = Math.min(d * 0.22, 12);
      return (
        <g>
          <rect x={left} y={top + backD} width={w} height={d - backD} rx={5} fill={color} opacity={0.9} />
          <rect x={left} y={top} width={w} height={backD} rx={4} fill={detail} opacity={0.7} />
          <rect x={left} y={top} width={w} height={d} rx={5} fill="none" stroke={detail} strokeWidth={1.5} />
        </g>
      );
    }
    default:
      return (
        <rect
          x={left}
          y={top}
          width={w}
          height={d}
          rx={4}
          fill={color}
          opacity={0.85}
          stroke={detail}
          strokeWidth={1.5}
        />
      );
  }
}

export function ItemsLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  return (
    <g data-layer="items">
      {Object.values(layer.items).map((item) => (
        <g
          key={item.id}
          transform={`translate(${item.x},${item.y}) rotate(${item.rotation})`}
          data-el-id={item.id}
          data-el-kind="items"
        >
          <ItemGlyph item={item} />
        </g>
      ))}
    </g>
  );
}
