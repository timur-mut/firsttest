# Floor-plan → scene JSON prompt

Send this prompt as the **text** of a vision request, with a floor-plan image
attached, to convert the drawing into the planner's importable scene JSON
(`{ version, scene }` — the same envelope `deserializeScene` parses and the API
stores). Use a strong vision model, **temperature 0**, and JSON/structured-output
mode if available.

The prompt below already encodes the lessons from testing: **convert mm → cm**,
treat dimension labels as **interior-clear** and place **outer** corners
accordingly, estimate **per-wall thickness**, and emit **door swing orientation**
(`flipX`/`flipY`). After getting the JSON, run the small normalizer at the bottom
before importing, for robustness.

---

## The prompt

````text
You are a floor-plan digitizer. You will be given an image of an apartment/house
floor plan. Convert it into ONE JSON object using the schema below.

Output ONLY the JSON object — no markdown, no code fences, no comments, no prose.

====================  UNITS & SCALE  ====================
- ALL numbers in the output are in CENTIMETERS (cm).
- Floor-plan dimension labels are almost always in MILLIMETERS — divide them by
  10 (1500 mm → 150 cm; 2190 mm → 219 cm). If a label is in meters ("3.50 m"),
  use 350 cm. Pick ONE consistent real-world scale for the whole drawing.
- Real-world DEFAULTS you supply yourself are already in cm and are NOT divided:
  door height 210, wall height 270, window height ~140, window sill 90.
- If the drawing has no usable dimensions, infer scale from standard sizes
  (interior door ~80–90 cm wide, exterior wall ~20 cm, interior wall ~10 cm).
- Round coordinates and sizes to whole cm.

====================  WHAT TO PRODUCE  ====================
The building shell (walls), the doors/windows cut into the walls, and (optionally)
furniture you can confidently identify. Rooms are detected automatically from the
walls — DO NOT output rooms/areas. Model only what you actually see.

====================  WALLS, DIMENSIONS & THICKNESS  ====================
- Dimension labels are INTERIOR CLEAR distances (between wall faces). Vertices in
  this model are the OUTER corners of the walls, and walls are drawn inward, so:
  place outer corners at (interior clear dimension + wall thickness) on each side
  — i.e. wrap the interior clear rectangle with the wall thickness — so the
  modeled rooms match the labels.
- Estimate thickness PER WALL from the drawing's line weight: exterior/structural
  walls are thicker (~20 cm), interior partitions thinner (~10 cm). Default 20/10
  if unsure. A wall shared by two rooms is a single wall.
- Walls form CLOSED LOOPS around each room. Where walls meet they SHARE one
  vertex (same id). Interior partitions connect to vertices on the perimeter.
- `vertices[*].lines` must list every wall id that references that vertex: for
  each wall (a,b), add the wall's id to vertex a's and vertex b's `lines`.

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
  Set door height ~210, altitude 0.
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
- Every lines[*].vertices id exists in `vertices`.
- Every holes[*].lineId exists in `lines`, and that wall's `holes` contains the id.
- Every vertex's `lines` matches the walls that reference it.
- Coordinates are in cm (you divided mm by 10). `selectedLayer` = "layer-1" exists.
  `areas` is {}.
- Output is a single raw JSON object and nothing else.

====================  EXAMPLE (format reference — a small studio)  ====================
A studio: a bathroom (top-left, ~1.50 m × 2.19 m) carved out of one open L-shaped
room. Exterior walls 20 cm, bathroom partitions 10 cm. Front door (top) and
bathroom door both swing inward; a window on the right and two on the south wall.

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

## Accuracy notes (from testing)

- **Scale is everything.** The #1 failure mode is forgetting **mm → cm** (a plan
  comes out 10× too big). Drawings with explicit dimensions digitize almost
  exactly once converted; unlabeled photos rely on the size heuristics.
- **Interior-clear vs outer corners.** Labels are interior clear; vertices are
  outer corners. Offsetting outward by the wall thickness makes the app's
  displayed room sizes match the labels (verified: a 1.50 × 2.19 m bath → 3.29 m²,
  matching its "3.3 m²" label).
- **Door orientation** is the hardest thing to read from a raster — the swing
  *side* (`flipY`) is usually clear; the hinge jamb (`flipX`) may need a manual
  flip after import. Tune via the model or by hand.
- For a first pass, focus on the **shell + openings** and skip furniture; add
  furniture once the geometry is right. Use the reference-image underlay
  (upload in the editor) to trace/fine-tune against the original drawing.
