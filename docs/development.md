# Development

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node 22+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (local Postgres)

## Run locally

**Per‑piece (recommended for development):**

```bash
docker compose up -d db                      # Postgres on :5432
dotnet run --project src/FirstTest.Api       # API on :5080, runs migrations on startup
cd client && npm install && npm run dev       # Vite on :5173 (proxies /api → :5080)
```

The dev API’s connection string lives in `src/FirstTest.Api/appsettings.Development.json` (points at `localhost:5432`). The Vite proxy (`client/vite.config.ts`) forwards `/api` to `:5080`, so the client calls relative `/api/...` in dev.

**Whole stack in Docker:** `docker compose up --build` → client on :8081, API on :5080, Postgres on :5432, pgAdmin on :5050.

## Build, lint, test

Client (`client/`):

```bash
npm run lint        # tsc --noEmit (type check)
npm run build       # tsc && vite build
npm run test:run    # vitest run (CI)
npm test            # vitest watch
```

API:

```bash
dotnet build FirstTest.sln -c Release
```

There are ~200 frontend tests (Vitest + Testing Library, jsdom). Each feature ships tests next to its module (`*.test.ts(x)`), reset against the shared fixture `client/src/planner/__fixtures__/sampleScene.ts`. The backend was verified with `dotnet build` plus live CRUD against Postgres.

## Project layout

```
client/src/
  app/                  router (TanStack Router routes), PlansView
  planner/
    contract/           types · geometry · snapping · catalogTypes · toolTypes · ids
    store/              index · history · helpers · slices/*
    render/             Viewport · SceneRenderer · layers/*
    tools/              registry · selectTool · panTool · wallTool · splitTool · holeTool · itemTool
    panels/             TopBar · Toolbar · Sidebar · PropertiesPanel
    catalog/            data · CatalogSidebar
    utils/              areaDetection (rooms + wall geometry)
    persistence/        serialize · storage · api
    shortcuts/          keymap
    config.ts           constants (grid size, snap radius, zoom clamp, miter limit, …)
src/FirstTest.Api/      Program.cs · Endpoints/ · Models/ · Data/ · Migrations/
docs/                   this documentation
.github/workflows/      ci.yml (build/test) · deploy-aws.yml (deploy)
```

## Conventions

- **TypeScript strict** (`noUnusedLocals`/`noUnusedParameters` on). Prefix intentionally‑unused params with `_`.
- **`@/`** path alias → `client/src/`.
- **State changes go through slice actions** (`mutate(draft => …)`), never direct store writes. One user action = one undo step (wrap transient drags in `pauseHistory`/`resumeHistory`).
- **Rooms/areas are derived** — render layers compute them via `computeRoomsCached` / `detectAreas`; don’t hand‑author `layer.areas` except name/color overrides through the area slice.
- **Tag interactive SVG** with `data-el-id` + `data-el-kind` (and `data-handle` for manipulation handles) so the Viewport can route events.

## Extending it

- **Add a tool** — create `tools/xTool.ts` exporting a `ToolDescriptor` (set `mode`, `icon`, `shortcut`, `handlers`), add the mode to `contract/types.ts` `Mode` if new, and register it in `tools/registry.ts`. The toolbar and keymap pick it up automatically.
- **Add a store action** — add it to the relevant slice interface + `create<X>Slice`, implemented via `mutate`. It’s available on `usePlannerStore`.
- **Add a render layer** — add `render/layers/XLayer.tsx` and mount it in `SceneRenderer` at the right z‑order.
- **Add furniture** — append an `ItemPrototype` to `catalog/data.ts`.
- **Add a DB migration** — drop a new ordered file in `src/FirstTest.Api/Migrations/Scripts/000N_*.sql` (embedded resource; DbUp runs pending scripts in order on startup).
- **Add an API endpoint** — follow the plans/todos pattern: model + DTOs in `Models/`, `I*Repository` + Dapper `*Repository` in `Data/`, a `Map*Endpoints` group in `Endpoints/`, register in `Program.cs`.

## Deployment (AWS, via GitHub Actions)

`.github/workflows/deploy-aws.yml` runs on push to `main` (paths `client/**`, `src/**`, the workflow):

- **Client** — `npm ci && npm run build` (with `VITE_API_URL` baked in), sync `dist/` to **S3**, invalidate **CloudFront**.
- **API** — build the Docker image, push to **ECR**, deploy to **Elastic Beanstalk**; migrations run on container startup.

The client and API are served from **separate CloudFront distributions**, so the client must call the API via `VITE_API_URL` (set as a GitHub repo variable) rather than a relative path. Required repo variables: `VITE_API_URL`, `S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_ROLE_ARN`. `ci.yml` runs the build/test checks on PRs.
