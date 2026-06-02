# FirstTest

A starter web application scaffold.

| Layer  | Technology |
|--------|------------|
| Database | PostgreSQL 16 |
| API | .NET 8 Minimal API · Dapper (queries) · DbUp (migrations) · Npgsql |
| Client | React 18 · Vite · TypeScript |
| Local dev | Docker Compose |
| Cloud (free tier) | Azure Static Web Apps (client) · Azure App Service F1 (API) · external free Postgres — Neon/Supabase (Bicep IaC) |
| CI/CD | GitHub Actions |

## Repository layout

```
first test/
├── FirstTest.sln
├── docker-compose.yml          # Postgres + API + client for local dev
├── src/FirstTest.Api/          # .NET 8 Minimal API
│   ├── Program.cs              # composition root, CORS, Swagger, runs migrations
│   ├── Endpoints/              # MapTodoEndpoints — REST routes
│   ├── Models/                 # records + request DTOs
│   ├── Data/                   # Dapper repository + connection factory
│   ├── Migrations/             # DbUp runner
│   │   └── Scripts/*.sql        # embedded, ordered migration scripts
│   └── Dockerfile
├── client/                     # React + Vite + TS
│   ├── src/api/todos.ts        # typed fetch client
│   ├── src/App.tsx
│   └── Dockerfile              # builds static site, served by nginx
├── infra/bicep/                # Azure infrastructure as code
│   ├── main.bicep
│   └── main.parameters.json
└── .github/workflows/          # ci.yml + deploy.yml
```

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 22+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for the local database / compose)

## Run locally

### Option A — full stack with Docker Compose

```bash
docker compose up --build
```

- Client: http://localhost:8081
- API + Swagger: http://localhost:5080/swagger
- Postgres: localhost:5432 (`firsttest` / `firsttest`)

### Option B — run each piece directly

1. Start a database:

   ```bash
   docker compose up -d db
   ```

2. Run the API (applies DbUp migrations on startup, seeds sample todos):

   ```bash
   dotnet run --project src/FirstTest.Api
   ```

   Swagger UI at http://localhost:5080/swagger.

3. Run the client:

   ```bash
   cd client
   npm install
   npm run dev
   ```

   App at http://localhost:5173. In dev the client proxies `/api` to the API
   (see `vite.config.ts`), so there are no CORS issues.

## API surface

| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/health`          | Liveness probe |
| GET    | `/api/todos`       | List todos |
| GET    | `/api/todos/{id}`  | Get one |
| POST   | `/api/todos`       | Create `{ "title": "..." }` |
| PUT    | `/api/todos/{id}`  | Update `{ "title": "...", "isComplete": true }` |
| DELETE | `/api/todos/{id}`  | Delete |

## Database migrations

Migrations are plain `.sql` files in `src/FirstTest.Api/Migrations/Scripts`,
embedded into the assembly and applied **in filename order** by DbUp on API
startup. DbUp records applied scripts in a `schemaversions` table, so each runs
once. To add a change, drop a new file (e.g. `0003_add_due_date.sql`) — the
numeric prefix controls ordering.

You can disable startup migrations by setting `RunMigrationsOnStartup` to
`false` in configuration (useful if you'd rather run them as a separate
release step).

## Source control — GitHub

```bash
cd "first test"
git init
git add .
git commit -m "Initial scaffold"
git branch -M main
git remote add origin https://github.com/<you>/firsttest.git
git push -u origin main
```

## Deploy to Azure (free tier)

This setup runs at **$0** using only free resources:

| Piece  | Azure resource | Cost |
|--------|----------------|------|
| Client | Static Web Apps — Free SKU | Free, permanent |
| API    | App Service — F1 (Free) Linux plan | Free, permanent |
| DB     | External free Postgres (**Neon** or **Supabase**) | Free, permanent |

> **Why not Azure PostgreSQL?** Azure's PostgreSQL Flexible Server has no
> permanent free tier (only "free for 12 months" on a brand-new account). Neon
> and Supabase both offer a genuinely forever-free Postgres, and the app only
> needs a connection string — no code changes.
>
> **F1 free-tier limits:** shared CPU, 60 min CPU/day, no "always on" (the API
> sleeps when idle, so the first request after a pause is slow), 1 GB storage.
> Fine for demos, not production.

### 1. Create a free Postgres database

Sign up at [Neon](https://neon.tech) or [Supabase](https://supabase.com), create
a database, and copy its connection details into an ADO.NET / Npgsql connection
string. SSL is required:

```
Host=<host>;Port=5432;Database=<db>;Username=<user>;Password=<pwd>;SSL Mode=Require;Trust Server Certificate=true
```

DbUp migrations run automatically on the API's first startup and seed the sample
todos.

### 2. Provision the Azure resources

You can use the portal, or the included Bicep (`infra/bicep/main.bicep`), which
creates the F1 App Service plan, the web app, and the Static Web App:

```bash
az group create -n firsttest-rg -l westeurope
az deployment group create -g firsttest-rg \
  -f infra/bicep/main.bicep \
  -p appName=firsttest \
  -p pgConnectionString='Host=...;SSL Mode=Require;Trust Server Certificate=true' \
  -p clientOrigin='https://<your-swa>.azurestaticapps.net'
```

(`clientOrigin` is the Static Web App URL, for CORS — you can re-run the
deployment to set it once the SWA exists, or set it later in the portal under
the web app's Configuration.)

### 3. Wire up GitHub → Azure

Add these in GitHub → Settings → Secrets and variables → Actions:

| Name | Type | Purpose |
|------|------|---------|
| `AZURE_WEBAPP_PUBLISH_PROFILE`     | secret | Web app → "Get publish profile" (download & paste contents) |
| `AZURE_STATIC_WEB_APPS_API_TOKEN`  | secret | Static Web App → "Manage deployment token" |
| `VITE_API_URL`                     | variable | Your API URL, e.g. `https://firsttest-api.azurewebsites.net` |

Also set `AZURE_WEBAPP_NAME` in `.github/workflows/deploy.yml` to your web app's
(globally-unique) name.

### 4. Deploy

- `.github/workflows/deploy.yml` — on pushes touching `src/**`, publishes the
  .NET API and deploys it to App Service via the publish profile.
- `.github/workflows/azure-static-web-apps.yml` — on pushes touching `client/**`,
  builds the Vite app (baking in `VITE_API_URL`) and deploys it to Static Web Apps.

Both can also be run manually from the Actions tab. After the first deploy, set
the web app's `Cors__AllowedOrigins` to your SWA URL so the browser can call the
API.

## Next steps / ideas

- Add unit tests (`FirstTest.Api.Tests`) — the CI workflow already runs `dotnet test`.
- Add a separate migration job in CI rather than migrating on app startup.
- Add authentication (e.g. Microsoft Entra ID) to the API and client.
- Move to paid tiers (App Service B1 + Azure PostgreSQL) when you need
  always-on and production SLAs.
