// Area slice — owned by Unit 4 (Room/area detection).
// Interface FROZEN by the foundation; Unit 4 implements the bodies and the
// `detectAreas` pure function in ../../utils/areaDetection.ts.

import type { SliceCreator } from '../storeTypes';
import { getSelectedLayer } from '../helpers';

export interface AreaSlice {
  /** Override a room's fill color. */
  setAreaColor(areaId: string, color: string): void;
}

export const createAreaSlice: SliceCreator<AreaSlice> = (mutate) => ({
  setAreaColor: (areaId, color) =>
    mutate((draft) => {
      const layer = getSelectedLayer(draft.scene);
      const area = layer.areas[areaId];
      if (area) area.color = color;
    }),
});
