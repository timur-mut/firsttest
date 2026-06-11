// Flooring catalog — the single source of truth for each covering's defaults
// and the layout patterns it supports. The properties panel reads this to build
// its controls, and `makeFlooring` produces a ready-to-use override when the
// user first picks a type.

import type { Flooring, FlooringPattern, FlooringType } from './types';

/**
 * What an element of the covering is, used only for UI wording and to decide
 * whether dimension inputs make sense:
 *   tile     — discrete tiles (size = width × length)
 *   plank    — long boards (size = width × length)
 *   sheet    — roll goods laid as a continuous surface (no element seams)
 *   seamless — poured / monolithic surface (no elements at all)
 */
export type FlooringElement = 'tile' | 'plank' | 'sheet' | 'seamless';

export interface FlooringSpec {
  type: FlooringType;
  /** Human label shown in the type dropdown. */
  label: string;
  element: FlooringElement;
  /** Default element width in world units. */
  defaultWidth: number;
  /** Default element length in world units. */
  defaultLength: number;
  /** Patterns offered for this covering (first is the default). */
  patterns: FlooringPattern[];
  /** Default element fill colour. */
  defaultColor: string;
  /** Default seam / grout colour. */
  defaultSeamColor: string;
}

// Dimensions are in centimetres, matching the planner's default unit. They are a
// realistic starting point; the user can change them per room.
export const FLOORING_SPECS: Record<FlooringType, FlooringSpec> = {
  'porcelain-stoneware': {
    type: 'porcelain-stoneware',
    label: 'Porcelain stoneware',
    element: 'tile',
    defaultWidth: 60,
    defaultLength: 60,
    patterns: ['grid', 'brick', 'diagonal'],
    defaultColor: '#d9d4cc',
    defaultSeamColor: '#b6b0a5',
  },
  tile: {
    type: 'tile',
    label: 'Tile',
    element: 'tile',
    defaultWidth: 30,
    defaultLength: 30,
    patterns: ['grid', 'brick', 'diagonal', 'herringbone'],
    defaultColor: '#e8e3da',
    defaultSeamColor: '#c3bdb2',
  },
  laminate: {
    type: 'laminate',
    label: 'Laminate',
    element: 'plank',
    defaultWidth: 19,
    defaultLength: 128,
    patterns: ['plank', 'brick', 'herringbone'],
    defaultColor: '#c9a06a',
    defaultSeamColor: '#a07f4f',
  },
  linoleum: {
    type: 'linoleum',
    label: 'Linoleum',
    element: 'sheet',
    defaultWidth: 250,
    defaultLength: 400,
    patterns: ['solid'],
    defaultColor: '#ccb892',
    defaultSeamColor: '#b09a72',
  },
  'quartz-vinyl': {
    type: 'quartz-vinyl',
    label: 'Quartz vinyl',
    element: 'plank',
    defaultWidth: 18,
    defaultLength: 122,
    patterns: ['plank', 'brick', 'herringbone'],
    defaultColor: '#bb9d76',
    defaultSeamColor: '#9a7f5c',
  },
  parquet: {
    type: 'parquet',
    label: 'Parquet',
    element: 'plank',
    defaultWidth: 14,
    defaultLength: 90,
    patterns: ['plank', 'brick', 'herringbone', 'chevron'],
    defaultColor: '#b07d4a',
    defaultSeamColor: '#8c6038',
  },
  'solid-parquet': {
    type: 'solid-parquet',
    label: 'Solid parquet',
    element: 'plank',
    defaultWidth: 7,
    defaultLength: 35,
    patterns: ['herringbone', 'chevron', 'grid'],
    defaultColor: '#a4692f',
    defaultSeamColor: '#7e4f23',
  },
  'self-leveling': {
    type: 'self-leveling',
    label: 'Self-leveling floor',
    element: 'seamless',
    defaultWidth: 100,
    defaultLength: 100,
    patterns: ['solid'],
    defaultColor: '#d7dadd',
    defaultSeamColor: '#d7dadd',
  },
  carpet: {
    type: 'carpet',
    label: 'Carpet',
    element: 'sheet',
    defaultWidth: 400,
    defaultLength: 400,
    patterns: ['solid'],
    defaultColor: '#99a39c',
    defaultSeamColor: '#99a39c',
  },
};

/** Display order for the type dropdown (matches the requested option order). */
export const FLOORING_ORDER: FlooringType[] = [
  'porcelain-stoneware',
  'tile',
  'laminate',
  'linoleum',
  'quartz-vinyl',
  'parquet',
  'solid-parquet',
  'self-leveling',
  'carpet',
];

/** Human label for a pattern, for dropdowns. */
export const PATTERN_LABELS: Record<FlooringPattern, string> = {
  grid: 'Grid',
  plank: 'Straight',
  brick: 'Offset (brick)',
  diagonal: 'Diagonal',
  herringbone: 'Herringbone',
  chevron: 'Chevron',
  solid: 'Solid',
};

/**
 * Build a full `Flooring` for a type using the catalog defaults. An optional
 * `patch` lets callers carry over compatible fields (e.g. keeping the current
 * colour when switching types); a pattern not supported by the new type is
 * dropped in favour of the type's default.
 */
export function makeFlooring(type: FlooringType, patch?: Partial<Flooring>): Flooring {
  const spec = FLOORING_SPECS[type];
  const pattern =
    patch?.pattern && spec.patterns.includes(patch.pattern) ? patch.pattern : spec.patterns[0];
  return {
    type,
    width: patch?.width ?? spec.defaultWidth,
    length: patch?.length ?? spec.defaultLength,
    pattern,
    angle: patch?.angle ?? 0,
    offsetX: patch?.offsetX ?? 0,
    offsetY: patch?.offsetY ?? 0,
    color: patch?.color ?? spec.defaultColor,
    seamColor: patch?.seamColor ?? spec.defaultSeamColor,
  };
}
