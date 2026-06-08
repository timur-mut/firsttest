# Floor-plan → scene JSON prompt

Send this prompt as the **text** of a vision request, with a floor-plan image
attached, to convert the drawing into the planner's importable scene JSON
(`{ version, scene }` — the same envelope `deserializeScene` parses and the API
stores). Use a strong vision model, **temperature 0**, and JSON/structured-output
mode if available.

The prompt below encodes the lessons from testing on **10 real plans**: pick ONE
real-world scale from the best available source (**graphic scale bar → dimension
labels in mm/cm/m/ft → area m² labels → standard-size heuristics**), decide
**interior-clear vs overall** per dimension (reconciling against m² labels), estimate
**per-wall thickness**, approximate **curved walls as polylines**, **ignore
non-structural noise** (legends, watermarks, colour fills, annotations), and emit
**door swing orientation** (`flipX`/`flipY`). After getting the JSON, run the small
normalizer at the bottom before importing, for robustness.

---

## The prompt

````text
You are a floor-plan digitizer. You will be given an image of an apartment/house
floor plan. Convert it into ONE JSON object using the schema below.

Output ONLY the JSON object — no markdown, no code fences, no comments, no prose.

====================  UNITS & SCALE  ====================
- ALL numbers in the output are in CENTIMETERS (cm).
- Establish ONE real-world scale for the WHOLE drawing. Choose your scale source in
  this PRIORITY order and just apply it:
    1) GRAPHIC SCALE BAR — a "0—5—10 m" ruler, usually in a corner. If present this is
       the most reliable source (it is immune to unit guesswork): measure how long the
       labelled distance is on the drawing and scale everything to it. Prefer it.
    2) DIMENSION LABELS. Convert each to cm:
         millimetres ÷10 (3500 -> 350),   metres x100 ("3.50 m" -> 350),
         centimetres x1,                   feet/inches  ft*30.48 + in*2.54.
       Metric plans use mm OR m — disambiguate by magnitude: an edge labelled 3500 is mm,
       "3.5" / "3,5" is metres; both mean 350 cm. Pick ONE unit for the whole drawing.
    3) AREA LABELS (m²). Even when linear dimensions are sparse, per-room "12.4 m²" and
       "TOTAL 71 m²" labels pin down the scale and let you cross-check the shell — use them.
    4) NO usable scale: infer from standard sizes. An interior door leaf is ~80-90 cm — use
       it as an on-drawing ruler. Exterior wall ~20-30 cm, interior wall ~10 cm. Typical
       rooms: bedroom 10-16 m², bathroom 3-6 m², kitchen 6-12 m², hallway 100-140 cm wide.
       PRESERVE the drawing's pixel proportions (do not distort the aspect ratio). Expect
       the result to need manual alignment against the reference image after import.
- Real-world DEFAULTS you supply yourself are already in cm and are NOT converted:
  door height 210, wall height 270, window height ~140, window sill 90.
- Round coordinates and sizes to whole cm.

====================  WHAT TO PRODUCE  ====================
The building shell (walls), the doors/windows cut into the walls, and (optionally)
furniture you can confidently identify. Rooms are detected automatically from the
walls — DO NOT output rooms/areas. Model only what you actually see.

IGNORE everything that is not building structure — do NOT turn it into geometry:
titles/captions, watermarks & logos, legends & colour keys, north arrows, the scale bar
itself, dimension lines and their leader/extension lines, annotation/callout text and
arrows, and decorative COLOUR FILLS or zone shading. Trace the walls underneath, not the
colours. Labels in any language are fine — read them for room type/size, don't transcribe.

====================  WALLS, DIMENSIONS & THICKNESS  ====================
- For each dimension decide whether it is INTERIOR-CLEAR or OVERALL:
    • A number sitting inside / right against ONE room is that room's interior-clear span.
    • A dimension CHAIN running ALONG THE OUTSIDE of the building is the exterior/overall
      size of the shell.
    • When unsure, reconcile with the AREA label: pick interior-vs-outer so the modeled
      room area matches the m². (A 2.7 x 1.8 m room labelled "3.9 m²" is giving OUTER dims —
      interior ~2.5 x 1.6; a 1.50 x 2.19 m room labelled "3.3 m²" is giving INTERIOR dims —
      1.50 x 2.19 = 3.29.) Do NOT blindly inflate every room outward.
- Vertices are the OUTER corners of walls, and walls draw inward, so:
    • interior-clear dim  -> place outer corners at (clear + wall thickness on each side),
      i.e. wrap the clear rectangle with the wall thickness.
    • overall/exterior dim -> place outer corners AT the dimension.
  Either way the app's displayed room sizes should match the labels — sanity-check a couple.
- Estimate thickness PER WALL from the drawing's line weight: exterior/structural walls are
  thicker (~20-30 cm), interior partitions thinner (~10 cm). Default 20/10 if unsure. A wall
  shared by two rooms is a single wall.
- Walls form CLOSED LOOPS around each room. Where walls meet they SHARE one vertex (same
  id). Interior partitions connect to vertices on the perimeter.
- CURVED walls (bay windows, round/curved rooms, a curved deck) — approximate the curve with
  a short straight-segment POLYLINE, one chord every ~10-20°. A single straight wall across a
  curve looks wrong. Plans may also be slightly rotated or have non-orthogonal wings; keep
  the TRUE wall angles, don't force everything to right angles.
- Open-plan space (kitchen/dining/living with no full wall between, breakfast bars, islands)
  is ONE room — only draw walls that actually reach the ceiling; skip half-height dividers.
- `vertices[*].lines` must list every wall id that references that vertex (the normalizer
  below rebuilds these, so it is fine to leave them approximate or empty).

====================  DOORS & WINDOWS  ====================
- Each is a "hole" on a wall: set `lineId` to its wall AND add the hole's id to
  that wall's `holes` array. `offset` (0..1) is the hole CENTER measured from
  vertices[0] -> vertices[1] (0.5 = centered).
- DOORS swing. Orientation is two booleans, relative to the wall direction
  d = (vertices[1] - vertices[0]) and its left-normal n = (-d.y, d.x):
    • flipY=false swings toward +n, flipY=true toward -n  → pick the side the
      door opens into (e.g. into the room/apartment).
    • flipX=false hinges at the vertices[0] end of the opening, flipX=true at the
      vertices[1] end → pick the hinge jamb shown in the drawing.
  Set door height ~210, altitude 0. (Doors are often drawn as a plain gap or a coloured
  bar with no swing arc — still model them as doors.)
- WINDOWS do not swing (no flips needed). Put them on exterior walls where shown;
  height ~120–150, altitude ~80–90. Balcony/French doors can be windows at
  altitude 0, height ~210.

====================  FURNITURE (optional)  ====================
Only add clearly identifiable pieces, as items at their center, sized in cm,
rotated to match. Use the closest ALLOWED type; skip anything uncertain:
sofa, armchair, chair, dining-table, coffee-table, desk, bed-single, bed-double,
wardrobe, bookshelf, dresser, counter, fridge, stove, sink, toilet, bathtub,
sink-bath, rug, plant, lamp

====================  SCHEMA (TypeScript)  ====================
type Output = {
  version: 1;
  scene: {
    name: string;                 // short plan name
    width: number;                // canvas cm, >= max vertex x + 200
    height: number;               // canvas cm, >= max vertex y + 200
    selectedLayer: "layer-1";
    meta: { unit: "cm"; pixelsPerUnit: 1 };
    layers: {
      "layer-1": {
        id: "layer-1";
        name: string;
        vertices: Record<string, { id: string; x: number; y: number; lines: string[] }>;
        lines:    Record<string, {                       // walls
          id: string; type: "wall"; vertices: [string, string];
          thickness: number; height: number; holes: string[];
        }>;
        holes:    Record<string, {                       // doors + windows
          id: string; type: "door" | "window"; lineId: string;
          offset: number; width: number; height: number; altitude: number;
          flipX?: boolean; flipY?: boolean;              // doors only
        }>;
        items:    Record<string, {                       // furniture (optional)
          id: string; type: string; x: number; y: number;
          rotation: number; width: number; depth: number;
          properties: { color: string };
        }>;
        areas: {};                                       // ALWAYS empty — derived
      };
    };
  };
};

====================  SELF-CHECK BEFORE ANSWERING  ====================
- You established ONE scale via the priority order (scale bar > dims > area > heuristics);
  if a scale bar or area labels exist, your geometry agrees with them.
- Interior-clear vs overall decided per dimension; rough room areas match any m² labels.
- Curves are polylines. Nothing non-structural (legend, north arrow, watermark, annotation,
  colour fill) became a wall.
- Every lines[*].vertices id exists in `vertices`.
- Every holes[*].lineId exists in `lines`, and that wall's `holes` contains the id.
- Every vertex's `lines` matches the walls that reference it.
- Coordinates are in cm (you converted to a single scale). `selectedLayer` = "layer-1"
  exists. `areas` is {}.
- Output is a single raw JSON object and nothing else.

====================  EXAMPLE (format reference — a small studio)  ====================
A studio: a bathroom (top-left, ~1.50 m × 2.19 m) carved out of one open L-shaped
room. Exterior walls 20 cm, bathroom partitions 10 cm. Front door (top) and
bathroom door both swing inward; a window on the right and two on the south wall.
(The bath's "1.50 × 2.19 m" are interior-clear — 1.50×2.19 = 3.29 m², matching a
"3.3 m²" label — so its outer corners sit at clear + 10 cm partition on each side.)

{
  "version": 1,
  "scene": {
    "name": "Studio",
    "width": 600,
    "height": 640,
    "selectedLayer": "layer-1",
    "meta": { "unit": "cm", "pixelsPerUnit": 1 },
    "layers": {
      "layer-1": {
        "id": "layer-1",
        "name": "Studio",
        "vertices": {
          "A": { "id": "A", "x": 0,   "y": 0,   "lines": ["topA", "leftB"] },
          "B": { "id": "B", "x": 470, "y": 0,   "lines": ["topB", "right"] },
          "C": { "id": "C", "x": 470, "y": 507, "lines": ["right", "bottom"] },
          "D": { "id": "D", "x": 0,   "y": 507, "lines": ["bottom", "leftA"] },
          "E": { "id": "E", "x": 175, "y": 0,   "lines": ["topA", "topB", "bathV"] },
          "F": { "id": "F", "x": 175, "y": 244, "lines": ["bathV", "bathH"] },
          "G": { "id": "G", "x": 0,   "y": 244, "lines": ["leftA", "leftB", "bathH"] }
        },
        "lines": {
          "topA":   { "id": "topA",   "type": "wall", "vertices": ["A", "E"], "thickness": 20, "height": 270, "holes": [] },
          "topB":   { "id": "topB",   "type": "wall", "vertices": ["E", "B"], "thickness": 20, "height": 270, "holes": ["entrance"] },
          "right":  { "id": "right",  "type": "wall", "vertices": ["B", "C"], "thickness": 20, "height": 270, "holes": ["winBed"] },
          "bottom": { "id": "bottom", "type": "wall", "vertices": ["C", "D"], "thickness": 20, "height": 270, "holes": ["winLiv2", "winLiv1"] },
          "leftA":  { "id": "leftA",  "type": "wall", "vertices": ["D", "G"], "thickness": 20, "height": 270, "holes": [] },
          "leftB":  { "id": "leftB",  "type": "wall", "vertices": ["G", "A"], "thickness": 20, "height": 270, "holes": [] },
          "bathV":  { "id": "bathV",  "type": "wall", "vertices": ["E", "F"], "thickness": 10, "height": 270, "holes": ["bathDoor"] },
          "bathH":  { "id": "bathH",  "type": "wall", "vertices": ["G", "F"], "thickness": 10, "height": 270, "holes": [] }
        },
        "holes": {
          "entrance": { "id": "entrance", "type": "door",   "lineId": "topB",   "offset": 0.22,  "width": 90,  "height": 210, "altitude": 0, "flipX": false, "flipY": false },
          "bathDoor": { "id": "bathDoor", "type": "door",   "lineId": "bathV",  "offset": 0.80,  "width": 70,  "height": 210, "altitude": 0, "flipX": false, "flipY": false },
          "winBed":   { "id": "winBed",   "type": "window", "lineId": "right",  "offset": 0.24,  "width": 150, "height": 140, "altitude": 90 },
          "winLiv1":  { "id": "winLiv1",  "type": "window", "lineId": "bottom", "offset": 0.649, "width": 176, "height": 210, "altitude": 0 },
          "winLiv2":  { "id": "winLiv2",  "type": "window", "lineId": "bottom", "offset": 0.266, "width": 176, "height": 210, "altitude": 0 }
        },
        "items": {},
        "areas": {}
      }
    }
  }
}
````

---

## How to use it

- Vision request, **temperature 0**, JSON/structured output if available.
- The result is the **import envelope** (`{ version, scene }`) — exactly what the
  client's `deserializeScene()` parses (see `client/src/planner/persistence/api.ts`
  and `serialize.ts`). If you'd rather call `setScene()` directly, pass the inner
  `.scene`.

## Recommended: normalize before importing

The plan still renders even if a few cross-refs are off (walls/rooms come from
`line.vertices`), but this rebuilds the vertex back-references and forces the
derived `areas` empty, making import bulletproof:

```ts
function normalize(env: { scene: any }) {
  for (const layer of Object.values<any>(env.scene.layers)) {
    for (const v of Object.values<any>(layer.vertices)) v.lines = [];
    for (const w of Object.values<any>(layer.lines)) {
      w.holes ??= [];
      for (const vid of w.vertices) layer.vertices[vid]?.lines.push(w.id);
    }
    layer.areas = {}; // rooms are derived on load
  }
  return env;
}
```

## Accuracy notes (from testing on 10 real plans)

Tested by importing 10 varied plans — RoomSketcher dimensioned plans, teoalida apartment
blocks (16×13 m and a 22×21 m 8-unit block), an East-German Plattenbau, FDR's Little White
House (curved sun deck), an apartment-block floor with only a scale bar, and annotated /
colour-zoned apartments — and overlaying each original as a reference underlay to compare.

- **Scale is everything, and the SOURCE matters.** Dimensioned plans digitize almost exactly
  once converted — but real plans label in **metres and m²** at least as often as mm, and
  some give only a **graphic scale bar**. Read the scale source in priority order
  (bar → linear dims → area labels → heuristics). The classic failure is a 10× error from
  assuming mm when the plan is in metres.
- **Interior-clear vs outer.** Per-room callouts are interior-clear; perimeter dimension
  chains are exterior. Use the **m² label to disambiguate** so rendered room areas match the
  drawing — a 2.7 × 1.8 m room marked 3.9 m² is giving OUTER dims, and wrapping it outward
  anyway oversizes it (it rendered 4.86 m²). Multi-room dimensioned plans (e.g. the 13 m ×
  9.4 m house, the 16 × 13 m block) otherwise overlay the original almost exactly.
- **No-dimension plans** come out plausibly sized but proportionally approximate (a 4-room
  Plattenbau landed at a believable ~61 m² but with guessed room aspect ratios). Use the
  reference-image underlay (upload in the editor) to trace/fine-tune against the original.
- **Curves** (the semicircular deck) import cleanly as a short polyline; one straight wall
  across a curve looks wrong.
- **Ignore the noise.** Watermarks, titles, legends, north arrows, colour-zone fills and
  annotation arrows must NOT become walls — this was the main source of spurious geometry on
  marketing- and diagram-style plans (a crime-scene diagram, a Russian zoning schematic).
- **Door orientation** is the hardest thing to read from a raster — the swing *side*
  (`flipY`) is usually clear; the hinge jamb (`flipX`) may need a manual flip after import.
- For a first pass, focus on the **shell + openings** and skip furniture; add furniture once
  the geometry is right.
