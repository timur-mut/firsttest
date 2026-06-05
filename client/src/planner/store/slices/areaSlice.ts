// Area slice — STUB owned by Unit 4 (Room/area detection).
// Interface FROZEN by the foundation; Unit 4 implements the bodies and the
// `detectAreas` pure function in ../../utils/areaDetection.ts.

import type { SliceCreator } from '../storeTypes';

export interface AreaSlice {
  /** Override a room's fill color. */
  setAreaColor(areaId: string, color: string): void;
}

export const createAreaSlice: SliceCreator<AreaSlice> = () => ({
  setAreaColor: (_areaId, _color) => {},
});
