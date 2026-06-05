// Items (furniture) layer — owned by Unit 5. Foundation ships a minimal
// rectangle renderer; Unit 5 replaces it with per-prototype SVG glyphs.

import { usePlannerStore } from '../../store';
import { getSelectedLayer } from '../../store/helpers';

export function ItemsLayer() {
  const layer = usePlannerStore((s) => getSelectedLayer(s.scene));
  return (
    <g data-layer="items">
      {Object.values(layer.items).map((item) => {
        const color = (item.properties.color as string | undefined) ?? '#94a3b8';
        return (
          <g
            key={item.id}
            transform={`translate(${item.x},${item.y}) rotate(${item.rotation})`}
            data-el-id={item.id}
            data-el-kind="items"
          >
            <rect
              x={-item.width / 2}
              y={-item.depth / 2}
              width={item.width}
              height={item.depth}
              rx={4}
              fill={color}
              opacity={0.85}
              stroke="currentColor"
              strokeWidth={1}
              className="text-foreground/40"
            />
          </g>
        );
      })}
    </g>
  );
}
