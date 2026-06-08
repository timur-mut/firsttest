# Planner — 2D Floor Planner

A Planner5D-like **2D floor planner** (inspired by [cvdlab/react-planner](https://github.com/cvdlab/react-planner), reimplemented in TypeScript). Draw walls, add doors/windows and furniture, detect rooms, and save plans to a database.

| Layer | Technology |
|-------|------------|
| Client | React 18 · TypeScript · Vite 5 · Tailwind 4 · Zustand + Immer · SVG rendering |
| API | .NET 10 Minimal API · Dapper (queries) · DbUp (migrations) · Npgsql |
| Database | PostgreSQL 16 |
| Local dev | Docker Compose |
| Cloud | AWS — CloudFront + S3 (client), Elastic Beanstalk (API), managed Postgres |
| CI/CD | GitHub Actions (build/test + deploy) |

## Documentation

- **[User guide](docs/user-guide.md)** — every tool, interaction, panel, and shortcut.
- **[Architecture](docs/architecture.md)** — the scene model, store, render layers, tools, wall‑thickness geometry, and backend.
- **[Development](docs/development.md)** — run, build, test, deploy; project layout; how to extend it.
- **[API reference](docs/api.md)** — the REST endpoints (`/api/plans`, `/api/todos`).
- **[Floor-plan import prompt](docs/floorplan-import-prompt.md)** — a vision-model prompt that turns a floor-plan image into importable scene JSON.

## Quick start

Prerequisites: [.NET 10 SDK](https://dotnet.microsoft.com/download), [Node 22+](https://nodejs.org/), [Docker](https://www.docker.com/).

```bash
# 1. Database
docker compose up -d db                 # Postgres on :5432

# 2. API (runs DB migrations on startup → :5080)
dotnet run --project src/FirstTest.Api

# 3. Client (Vite dev server on :5173, proxies /api → :5080)
cd client && npm install && npm run dev
```

Open http://localhost:5173. Or run the whole stack with `docker compose up --build` (client on :8081, API on :5080).

## What it does (at a glance)

- **Draw** chained walls; **split** a wall to add a corner; place **doors/windows** and **furniture** (searchable, drag‑and‑drop catalog).
- **Edit** by dragging: move walls, corners, furniture (move/rotate/**resize**), and doors/windows; pan and zoom.
- **Thickness‑aware geometry**: vertices are the outer corners, walls are drawn inward with mitered joints (and a **step** where collinear walls differ in thickness); rooms are detected automatically with **inner area + perimeter** and **inside** wall dimensions.
- **Properties**: wall thickness, door orientation, furniture size/rotation/color, **room name** and color.
- **Persistence**: localStorage autosave, JSON export/import, and **database‑backed plans** with a list view and Cloud Save.
- **Undo/redo** for every edit, with grid/vertex/line **snapping**.

See the **[user guide](docs/user-guide.md)** for the full list.
