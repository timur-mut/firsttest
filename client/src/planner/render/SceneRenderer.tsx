// ─────────────────────────────────────────────────────────────────────────────
// Scene render mount — FROZEN aggregator. Foundation-owned.
//
// Mounts every layer in a fixed z-order. Z-order (back -> front): areas, walls,
// holes, items, vertices (corner handles), dimensions, selection, draft overlay.
// ─────────────────────────────────────────────────────────────────────────────

import { AreasLayer } from './layers/AreasLayer';
import { WallsLayer } from './layers/WallsLayer';
import { HolesLayer } from './layers/HolesLayer';
import { ItemsLayer } from './layers/ItemsLayer';
import { VerticesLayer } from './layers/VerticesLayer';
import { DimensionsLayer } from './layers/DimensionsLayer';
import { SelectionLayer } from './layers/SelectionLayer';
import { DraftLayer } from './layers/DraftLayer';

export function SceneRenderer() {
  return (
    <g data-scene>
      <AreasLayer />
      <WallsLayer />
      <HolesLayer />
      <ItemsLayer />
      <VerticesLayer />
      <DimensionsLayer />
      <SelectionLayer />
      <DraftLayer />
    </g>
  );
}
