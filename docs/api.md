# API reference

Base URL: the API origin (dev: `http://localhost:5080`, proxied as `/api`; prod: `VITE_API_URL`). All bodies are JSON. In Development, an interactive reference is at `/scalar` and the OpenAPI document at `/openapi/v1.json`. Health check: `GET /health` → `{ "status": "healthy" }`.

CORS allows the configured client origins (`Cors:AllowedOrigins`).

---

## Plans — `/api/plans`

A plan is a saved floor plan. The **scene** is the client’s serialized envelope (`{ version, scene }`) stored as `jsonb` and returned as a JSON **string**.

| Method | Path | Body | Success | Notes |
|--------|------|------|---------|-------|
| `GET` | `/api/plans` | — | `200` `PlanSummary[]` | Newest first; **no** scene payload. |
| `GET` | `/api/plans/{id}` | — | `200` `Plan` / `404` | Full plan incl. `scene`. |
| `POST` | `/api/plans` | `CreatePlanRequest` | `201` `Plan` | `400` if `name`/`scene` empty. |
| `PUT` | `/api/plans/{id}` | `UpdatePlanRequest` | `200` `Plan` / `404` | Bumps `updatedAt`. |
| `DELETE` | `/api/plans/{id}` | — | `204` / `404` | |

**Shapes**

```jsonc
// PlanSummary
{ "id": 1, "name": "My Plan", "createdAt": "2026-…Z", "updatedAt": "2026-…Z" }

// Plan (adds the scene as a JSON string)
{ "id": 1, "name": "My Plan",
  "scene": "{\"version\":1,\"scene\":{ …Scene… }}",
  "createdAt": "2026-…Z", "updatedAt": "2026-…Z" }

// CreatePlanRequest / UpdatePlanRequest
{ "name": "My Plan", "scene": "{\"version\":1,\"scene\":{ …Scene… }}" }
```

The client sends `scene` as `serializeScene(scene)` and parses the returned `scene` with `deserializeScene` (validation + migration). See `client/src/planner/persistence/api.ts` and `serialize.ts`.

**Examples**

```bash
# Create
curl -X POST http://localhost:5080/api/plans \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo","scene":"{\"version\":1,\"scene\":{\"name\":\"Demo\"}}"}'

# List / fetch / delete
curl http://localhost:5080/api/plans
curl http://localhost:5080/api/plans/1
curl -X DELETE http://localhost:5080/api/plans/1
```

---

## Todos — `/api/todos`

The original starter (kanban) feature, still available.

| Method | Path | Body | Success |
|--------|------|------|---------|
| `GET` | `/api/todos` | — | `200` `TodoItem[]` |
| `GET` | `/api/todos/{id}` | — | `200` `TodoItem` / `404` |
| `POST` | `/api/todos` | `{ "title": "…" }` | `201` `TodoItem` |
| `PUT` | `/api/todos/{id}` | `{ "title", "status" }` | `200` / `404` |
| `PUT` | `/api/todos/reorder` | `{ "status", "ids": number[] }` | `200` `TodoItem[]` |
| `DELETE` | `/api/todos/{id}` | — | `204` / `404` |

`TodoItem`: `{ id, title, status: 'todo'|'active'|'done', position, createdAt }`.

---

## Storage

PostgreSQL, applied by DbUp migrations on API startup (`Migrations/Scripts/*.sql`):

```sql
-- plans (0005_create_plans.sql)
id SERIAL PK · name TEXT · scene JSONB · created_at TIMESTAMPTZ · updated_at TIMESTAMPTZ

-- todos (0001–0004)
id SERIAL PK · title TEXT · status TEXT CHECK(todo|active|done) · position INT · created_at TIMESTAMPTZ
```
