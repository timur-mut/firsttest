// Floor covering fill for a single room. Paints the room's chosen flooring —
// the element polygons from the pattern generator, clipped to the room's inner
// (floor) polygon. Rendered by AreasLayer on top of the plain area colour.

import { memo, useMemo } from 'react';
import type { Point } from '../../contract/types';
import type { Flooring } from '../../flooring/types';
import { boundsOf, generateTiles } from '../../flooring/patterns';
import { clamp } from '../../config';
import { usePlannerStore } from '../../store';

interface FloorFillProps {
  /** Room id — used to namespace the clip-path. */
  areaId: string;
  /** Inner (floor) polygon in world coordinates. */
  polygon: Point[];
  flooring: Flooring;
}

const toPoints = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

function FloorFillImpl({ areaId, polygon, flooring }: FloorFillProps) {
  // The floor is drag-repositionable with the select tool ('idle' mode).
  const draggable = usePlannerStore((s) => s.mode === 'idle');
  const tiles = useMemo(
    () => generateTiles(flooring, boundsOf(polygon)),
    [flooring, polygon],
  );

  // Grout/seam line width in world units, scaled to the element size.
  const seamWidth = clamp(Math.min(flooring.width, flooring.length) * 0.03, 0.3, 1.5);
  const clipId = `floor-clip-${areaId}`;
  const polyPoints = toPoints(polygon);

  return (
    <g data-floor={flooring.type} style={{ cursor: draggable ? 'move' : undefined }}>
      <defs>
        <clipPath id={clipId}>
          <polygon points={polyPoints} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* Base coat: fills the whole floor (and stands in for `solid`). */}
        <polygon points={polyPoints} fill={flooring.color} />
        {tiles.map((tile, i) => (
          <polygon
            key={i}
            points={toPoints(tile)}
            fill={flooring.color}
            stroke={flooring.seamColor}
            strokeWidth={seamWidth}
            strokeLinejoin="miter"
          />
        ))}
      </g>
    </g>
  );
}

export const FloorFill = memo(FloorFillImpl);
