// Hole slice — STUB owned by Unit 3 (Doors & windows).
// Interface FROZEN by the foundation; Unit 3 implements the bodies.

import type { HoleType } from '../../contract/types';
import type { SliceCreator } from '../storeTypes';

export interface HoleSlice {
  /** Add a hole to a line at a fractional offset [0,1]. Returns nothing. */
  addHole(lineId: string, type: HoleType, offset: number): void;
  /** Slide a hole along its line to a new fractional offset. */
  moveHole(holeId: string, offset: number): void;
  /** Delete a hole. */
  removeHole(holeId: string): void;
  /** Update editable hole properties (width/height/altitude). */
  updateHole(holeId: string, patch: Partial<{ width: number; height: number; altitude: number }>): void;
}

export const createHoleSlice: SliceCreator<HoleSlice> = () => ({
  addHole: (_lineId, _type, _offset) => {},
  moveHole: (_holeId, _offset) => {},
  removeHole: (_holeId) => {},
  updateHole: (_holeId, _patch) => {},
});
