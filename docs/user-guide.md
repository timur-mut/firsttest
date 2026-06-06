# User guide

The app opens on the **Plans** screen — a list of your saved plans. Opening a plan (or starting a new one) takes you to the **editor**, whose screen has a **top bar**, a left **toolbar**, a **catalog** sidebar (left), the **canvas** (center), and a **properties** panel (right). The open plan’s id is shown in the URL (`/editor/<id>`), so reloading or sharing that link reopens the plan.

**Collapsible panels & mobile.** The catalog and properties panels are collapsible: use the panel toggles at the left/right ends of the top bar (or the collapse button in each panel’s header) to hide or show them. On desktop the panels dock beside the canvas; on phones they slide in as overlays over the canvas with a dimmed backdrop (tap it to close), and they start collapsed so the canvas gets the full screen. The top bar’s file actions scroll horizontally when space is tight.

---

## Toolbar (tools)

Pick a tool from the left strip or press its keyboard shortcut. The active tool is highlighted.

| Tool | Key | What it does |
|------|-----|--------------|
| **Select** | `V` | Default tool. Click to select; drag elements/handles to edit; drag empty canvas to pan. |
| **Pan** | `H` | Drag anywhere to move the whole view. |
| **Wall** | `W` | Draw chained walls: click to place corners; double‑click / Enter to finish; Esc to cancel. |
| **Add corner** | `C` | Click a wall to insert a corner there (splits the wall in two); the corner is selected so you can drag it. |
| **Door / Window** | `D` | Click a wall to place a door (or window); drag to slide it along the wall. |
| **Furniture** | `F` | Click to place the current furniture prototype (primary placement is drag‑and‑drop from the catalog). |

Below the tools are **snap toggles** (grid / vertex / line) and **undo / redo** buttons.

---

## Drawing & placing

- **Walls** — with the Wall tool, click successive points to draw a connected chain. New points snap to the grid, to existing vertices, and (with Shift) to 15° angles. Walls merge onto a coincident existing vertex. Finish with a double‑click or Enter; cancel the in‑progress chain with Esc.
- **Doors & windows** — with the Door/Window tool, click on a wall to drop an opening at that point; it’s stored as a fraction along the wall and clamped to stay inside it.
- **Furniture** — open the **Catalog** (left), search/browse by category, and **drag a tile onto the canvas** to place it. The catalog covers seating, tables, beds, storage, kitchen, bathroom, and decor.
- **Add a corner / split a wall** — with the Add‑corner tool, click anywhere on a wall to insert a vertex; the wall becomes two walls sharing that corner (doors/windows are redistributed to the correct half). The new corner is selected for immediate dragging.

---

## Selecting & editing (Select tool)

Click an element to select it. Shift‑click to extend/toggle the selection. Click empty canvas to clear it. The **properties panel** shows editors for the current selection; **Delete/Backspace** removes it.

Drag to edit:

| Drag target | Result |
|-------------|--------|
| **Furniture body** | Move the item (snaps to grid). |
| **Furniture corner handle** | **Resize** the item (symmetric about its center, respects rotation, min size). |
| **Furniture rotate handle** (knob above) | **Rotate** about the center; hold **Shift** to snap to 15°. |
| **Wall body** | Translate the whole wall; shared corners carry adjacent walls along. |
| **Corner (vertex)** | Move the corner; every attached wall follows. |
| **Door / window** | Slide it along its wall. |
| **Empty canvas** | Pan the view (a plain click instead clears the selection). |

Every drag is **one undo step**.

### Properties panel editors

- **Furniture** — width, depth, rotation, color; Delete.
- **Door / Window** — width, height, altitude; for **doors**, an **Orientation** control (flip hinge side / flip swing side → the four door orientations); Delete.
- **Wall** — length (read‑only), editable **thickness**, height; Delete.
- **Corner** — exact **X / Y** position.
- **Room** — **Name** (e.g. “Living Room”, shown on the room) and fill **Color**.

---

## Rooms, walls & measurements

- **Rooms** are detected automatically from closed wall loops. Each room is filled and labeled with its **inner (floor) area** in m² and its **perimeter**; name it via the Room properties.
- **Wall thickness is real geometry.** Vertices are the **outer corners** of the room; walls are drawn **inward** by their thickness with **mitered** joints. Where two collinear walls (the wall continues, 180°) have **different thicknesses**, a perpendicular **step** is drawn between them.
- **Dimensions are measured on the inside** — each wall’s label shows the length of its inner face, placed just inside the room (real floor‑plan convention).

---

## View & snapping

- **Zoom** with the mouse wheel (zooms toward the cursor) or the top‑bar `−` / `%` / `+` controls; click the `%` readout to reset the view.
- **Pan** with the Pan tool, by dragging empty canvas, or with the middle mouse button.
- **Snapping** (toggle in the toolbar): **grid**, **vertex**, and **line**. Priority is vertex → line → grid.

---

## Projects & saving

Top‑bar actions:

- **Project name** — click to rename; shown in the title bar and used as the plan name.
- **New** — start a blank project.
- **Save / Open** — save to / load from the browser (localStorage).
- **Export / Import** — download the plan as a `.json` file / load one back.
- **Cloud Save** — save the current plan to the **database** (creates a new plan, or updates the one you’re editing). Shows “Saved ✓”.
- **Plans** — open the **plans list**.

### Plans list

The default screen: a grid of every plan saved to the database. From here you can **Open** a plan (navigates to `/editor/<id>`, loading it into the editor), **Delete** a plan, start a **New plan**, or **Refresh** the list. To return here from the editor, use the **Plans** button in the top bar. Empty and error states are shown when there are no plans or the API is unreachable.

---

## Keyboard shortcuts

| Keys | Action |
|------|--------|
| `V` / `H` / `W` / `C` / `D` / `F` | Select / Pan / Wall / Add corner / Door‑Window / Furniture tool |
| `Ctrl`/`Cmd` + `Z` | Undo |
| `Ctrl`/`Cmd` + `Shift` + `Z`, or `Ctrl` + `Y` | Redo |
| `Esc` | Cancel the current draft, deselect, return to Select |
| `Delete` / `Backspace` | Delete the selection |
| `Shift` (while drawing a wall) | Snap the segment to 15° angles |
| `Shift` (while rotating furniture) | Snap rotation to 15° |

Shortcuts are ignored while typing in an input field.
