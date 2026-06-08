# Architecture

## Overview

```
┌────────────────────────── Client (React + Vite + TS) ──────────────────────────┐
│  App ─► RouterProvider:  "/" PlansView  ·  "/editor[/$planId]" PlannerApp (editor) │
│                                                                                  │
│  TopBar · Toolbar · CatalogSidebar · Viewport(SVG) · Sidebar/Properties          │
│                                                                                  │
│  usePlannerStore (Zustand + Immer)  ◄──actions──  tools/*  &  panels/*           │
│        │ scene, mode, selected, zoom/pan, snapMask, history                      │
│        ▼                                                                          │
│  render/ layers (SVG)   ◄── computeRooms / detectAreas (utils) ── contract/geom  │
│                                                                                  │
│  persistence/ (serialize · localStorage/file · api → /api/plans)                 │
└──────────────────────────────────────────────┬───────────────────────────────────┘
                                                │ /api  (Vite proxy in dev; VITE_API_URL in prod)
┌───────────────────────────────────────────────▼──────────── API (.NET 10 Minimal API) ┐
│  Program.cs → MapTodoEndpoints / MapPlanEndpoints   ·  CORS  ·  DbUp migrations on boot │
│  Endpoints/ → Data/ (Dapper repositories) → PostgreSQL (todos, plans)                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Client lives in `client/`, backend in `src/FirstTest.Api/`. The frontend was built as a frozen **contract** + per‑feature modules so work could parallelize; that structure remains.

---

## The scene model (`client/src/planner/contract/types.ts`)

Everything is a normalized `Record<id, T>` (no arrays of entities), inspired by react-planner.

- **`Vertex`** `{ id, x, y, lines: string[] }` — a corner. `lines` back‑references every wall touching it. **Vertices are the OUTER corners of a room.**
- **`Line`** (wall) `{ id, type:'wall', vertices:[id,id], thickness, height, holes: string[] }`.
- **`Hole`** (door/window) `{ id, type:'door'|'window', lineId, offset, width, height, altitude, flipX?, flipY? }`. `offset ∈ [0,1]` is the fractional position of the hole **center** along the line; `flipX`/`flipY` give the four door orientations.
- **`Item`** (furniture) `{ id, type, x, y, rotation, width, depth, properties }` — `x,y` is the center; `rotation` in degrees.
- **`Area`** (room — derived) `{ id, vertices: string[], area, color, name? }`. Produced by area detection; only the area slice writes it (name/color overrides).
- **`Layer`** `{ id, name, vertices, lines, holes, items, areas }` — MVP uses one layer; the map is forward‑compat.
- **`Scene`** `{ name, width, height, layers, selectedLayer, meta:{ unit:'cm'|'mm'|'in', pixelsPerUnit } }`.
- **`Mode`** — `idle | drawing-wall | drawing-hole | splitting-wall | placing-item | dragging-* | rotating-item | panning`.
- **`Selection`** — typed buckets: `{ vertices, lines, holes, items, areas }` (each a `string[]`).

---

## Store (`client/src/planner/store/`)

A single Zustand store, `usePlannerStore`, composed from **slices** with Immer‑style mutations.

- **`index.ts`** — `create()` composes core state (`scene`, `mode`, `selected`, `zoom`, `pan`, `snapMask`, `history`) + history controls + every slice.
- **`history.ts`** — snapshot‑based **undo/redo** as a wrapper around `set`. Slices mutate via `mutate(draft => …)`, which records one undo step whenever `scene` changes. Transient drags call `pauseHistory()` / `resumeHistory()` so a whole gesture is a single step. `zoom`/`pan`/`selected`/`mode` are **not** in `scene`, so view/selection changes aren’t undoable.
- **`helpers.ts`** — `getSelectedLayer`, `applyDerived` (recompute rooms after wall edits), `emptySelection`, `makeEmptyScene`.
- **`slices/`** — one file per concern; each exports an interface + `create<X>Slice`.

Key actions by slice:

| Slice | Actions |
|-------|---------|
| **scene** | `setMode`, `setScene`, `resetScene`, `renameProject`, `selectLayer`, `toggleSnap`, `recomputeAreas` |
| **wall** | `beginWall`, `addWallPoint`, `updateWallDraft`, `finishWall`, `cancelWall`, `moveVertex`, `moveLine`, `setLineThickness`, `splitLine`, `removeLine` |
| **hole** | `addHole`, `moveHole`, `removeHole`, `updateHole` |
| **furniture** | `addItem`, `moveItem`, `rotateItem`, `removeItem`, `updateItem` |
| **selection** | `select`, `selectMany`, `clearSelection`, `deleteSelected` |
| **area** | `setAreaColor`, `setAreaName` |
| **viewport** | `setZoom`, `setPan`, `panBy`, `zoomAt`, `resetView`, `fitToContent` |
| **history** | `undo`, `redo`, `clearHistory`, `pauseHistory`, `resumeHistory`, `canUndo`, `canRedo` |

---

## Rendering (`client/src/planner/render/`)

SVG, declarative, hit‑testable. The **`Viewport`** is the SVG root: it draws the grid, applies the pan/zoom transform, converts pointer events to world coordinates (plus a snapped point + the element under the cursor), and dispatches them to the **active tool’s** handlers. It also handles wheel‑zoom, middle/space‑drag pan, and catalog drag‑drop.

`SceneRenderer` mounts the layers in a fixed z‑order (back → front): **areas → walls → holes → items → vertices → dimensions → selection → draft**. Interactive elements carry `data-el-id` + `data-el-kind` (and handles carry `data-handle`, e.g. `rotate`/`resize`) so the Viewport can report the target/handle to tools.

Layers: `AreasLayer` (room fill + area/perimeter labels), `WallsLayer` (mitered wall trapezoids), `HolesLayer` (door swing / window panes), `ItemsLayer` (furniture glyphs), `VerticesLayer` (corner handles), `DimensionsLayer` (inside wall lengths), `SelectionLayer` (outlines + resize/rotate handles), `DraftLayer` (in‑progress wall chain).

---

## Tools (`client/src/planner/tools/`)

Each tool is a `ToolDescriptor` (`contract/toolTypes.ts`): `id`, `label`, lucide `icon`, `mode`, `shortcut`, `group`, optional `handlers` (`onPointerDown/Move/Up`, `onKeyDown`, `onDeactivate`). `registry.ts` aggregates them and resolves a tool by `mode` or `shortcut`. Tools read/write state via `usePlannerStore.getState()`.

The **Select tool** (`selectTool.ts`) is where most interaction lives — it routes a pointer gesture to one of: item move, item **resize** (corner handle), item **rotate** (rotate handle), wall translate, vertex move, **door/window slide**, or canvas pan, each wrapping its mutations in pause/resume history.

---

## Geometry & rooms

- **`contract/geometry.ts`** — pure helpers: `distance`, `lerp`/`pointOnLine`, `projectPointOnSegment`, `linePolygon`, `shoelaceSignedArea`, `polygonArea`, `polygonPerimeter`, `polygonCentroid`, `pointInPolygon`, `lineIntersection`, `insetPolygon`, angle helpers.
- **`contract/snapping.ts`** — `snapPoint` (vertex > line > grid priority, honoring the snap mask).
- **`utils/areaDetection.ts`** — the room engine:
  - `detectRoomCycles` — finds minimal interior faces of the wall graph (a TS port of react-planner’s inner‑cycle / planar‑face algorithm: adjacency → strip degree‑1 → walk faces by “hardest‑right turn” → keep positively‑oriented faces).
  - `computeRooms` / `computeRoomsCached` — for each room, computes the **outer** polygon (vertices), the **inner** floor polygon, `area`, `perimeter`, `centroid`, and one **mitered quad per wall**. Walls are inset **inward** by their thickness; a wall shared by two rooms insets half its thickness from each side. Inner corners are computed **per wall**: a mitered intersection where walls turn, or each wall’s own perpendicular foot where they’re collinear — which produces a **step** when collinear walls differ in thickness. Redundant collinear vertices are simplified away.
  - `detectAreas` — Area records keyed by a **deterministic `roomId`** (vertex‑set invariant), so a room’s name/color survive recomputation.

This is the “thickness‑aware” model: outer‑corner vertices, inward mitered walls, inner area/perimeter, inside dimensions, and steps at collinear thickness changes.

---

## Persistence (`client/src/planner/persistence/`)

- **`serialize.ts`** — `serializeScene` / `deserializeScene`: a versioned envelope `{ version, scene }` with validation and a migration seam; derived `areas` are stripped on save and re‑added on load.
- **`storage.ts`** — localStorage save/load, debounced autosave, and file export/import.
- **`api.ts`** — the DB client: `listPlans`, `loadPlanFromServer`, `savePlanToServer`, `updatePlanOnServer`, `deletePlanFromServer`. Base URL is `import.meta.env.VITE_API_URL ?? ''` (empty in dev → Vite proxy; the API origin in prod). The scene travels as the serialized envelope, stored server‑side as `jsonb`. Save/update also carry the optional **reference image** (a JSON string, sibling of the scene); `loadPlanFromServer` returns `{ scene, referenceImage }`.

### Reference-image underlay

A user-uploaded floor-plan image can be shown behind the geometry for manual tracing. It lives in a standalone `useReferenceImageStore` (`planner/store/referenceImageStore.ts`, kept out of `scene`/undo), is drawn by `ReferenceImageLayer` (mounted first/backmost in `SceneRenderer`, in world coordinates, with self-contained drag-to-move when unlocked), and is controlled by `ReferenceImagePanel` in the right sidebar (upload, opacity, scale/rotation/position, lock, hide, remove). It is **persisted with the plan** in a nullable `reference_image` jsonb column (not the frozen scene contract): hydrated by the editor route loader and sent on Cloud Save.

## Routing (`client/src/app/router.tsx`)

App‑level navigation uses **TanStack Router** (code‑based). The plans list is the home route; opening a plan puts its id in the URL.

| Route | Screen | Notes |
|-------|--------|-------|
| `/` | `PlansView` (saved‑plans list) | the default screen |
| `/editor` | `PlannerApp` | a new, unsaved plan |
| `/editor/$planId` | `PlannerApp` | a saved plan — a **loader** fetches it (`loadPlanFromServer`) and loads it into the store before the editor renders, so a direct visit/reload/share of the URL restores the plan; load failures render an error fallback |

The planner is unit‑tested by rendering its components without a `RouterProvider`, so deep components (e.g. `TopBar`) navigate via the exported `router` **singleton** imperatively (`router.navigate(...)`) rather than router hooks. The bound plan id is derived from the URL via `getCurrentPlanId()` (used by Cloud Save to choose create vs. update).

### Collapsible panels & responsive layout

The catalog (left) and properties (right) panels are collapsible, driven by a tiny `usePanelStore` (`client/src/planner/panels/panelStore.ts`) kept separate from the scene store (so panel visibility is never undone or persisted). Toggles live at both ends of the `TopBar`, plus a collapse button in each panel header. Defaults: open on desktop, collapsed on mobile. On desktop (`md+`) panels dock in flow and collapse by width; on mobile they become slide‑in drawers over the canvas (`PlannerApp` renders a tap‑to‑close backdrop). Collapsed panels use `visibility:hidden` so their controls leave the tab/a11y order. The `TopBar`’s file actions live in a horizontally‑scrollable middle so the panel toggles and zoom stay anchored and reachable on small screens.

---

## Backend (`src/FirstTest.Api/`)

.NET 10 Minimal API. `Program.cs` is the composition root: it reads the `Postgres` connection string, registers the Dapper connection factory + repositories, configures CORS (`Cors:AllowedOrigins`), runs **DbUp** migrations on startup, and maps the endpoint groups.

```
Program.cs            composition root, CORS, migrations, endpoint mapping
Endpoints/            MapTodoEndpoints, MapPlanEndpoints (route groups)
Models/               records + request DTOs (TodoItem, Plan, *Request)
Data/                 IDbConnectionFactory + Npgsql factory; *Repository (Dapper)
Migrations/           DatabaseMigrator (DbUp) + Scripts/*.sql (embedded, ordered)
```

- **Plans** are stored in a `plans` table (`id`, `name`, `scene jsonb`, `reference_image jsonb` (nullable), `created_at`, `updated_at`); the scene and reference image are written/read as JSON text cast to/from `jsonb`.
- **Todos** are the original starter feature (kanban) and remain in place.

See **[api.md](api.md)** for the endpoints and the data flow.
