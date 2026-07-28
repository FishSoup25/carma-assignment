# CARMA Media Signal Service

Monorepo for the Senior Fullstack Engineer home assignment.

## Structure

```
├── database/     # Dockerized PostgreSQL configuration and init scripts
├── backend/      # Node.js + Express API (TypeScript)
├── frontend/     # Vite + React UI (TypeScript)
├── shared/       # Shared TypeScript types used by frontend and backend
└── documents/    # Assignment brief and sample data
```

## Prerequisites

- Node.js 20.19+ (22+ recommended)
- Docker and Docker Compose

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
npm run docker:up
```

This starts only the database by default. Backend and frontend run locally during development.

The schema is defined in `database/init/` (extensions in `01-init.sql`, `articles` table in `02-articles.sql`). Init scripts run only on a fresh database volume.

### 3. Seed sample articles

```bash
npm run seed:articles
```

Loads the 20 articles from `documents/sample_articles.json`. Enrichment columns (`model_handle`, `summary`, `sentiment`, `topic_tags`) are left NULL until the LLM enrichment task runs. The script is idempotent and safe to re-run.

If you change the schema after the database has already been initialized, reset the volume and start again:

```bash
npm run docker:down
docker compose down -v
npm run docker:up
npm run seed:articles
```

### 4. Run development servers

In separate terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

### Full stack via Docker

To run all services in Docker:

```bash
docker compose --profile full up --build
```

## Environment Variables

Each package has its own `.env` file (see `.env.example` in each folder):

| Folder     | Key variables                                      |
|------------|----------------------------------------------------|
| `database/`| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`|
| `backend/` | `DATABASE_URL`, `PORT`, LLM API keys (later)       |
| `frontend/`| `VITE_API_BASE_URL`, `VITE_APP_TITLE`              |

## Scripts

| Command              | Description                          |
|----------------------|--------------------------------------|
| `npm run dev:backend`| Start backend dev server             |
| `npm run dev:frontend`| Start Vite dev server               |
| `npm run build`      | Build all workspaces                 |
| `npm run lint`         | Lint backend and frontend            |
| `npm run docker:up`  | Start PostgreSQL container           |
| `npm run docker:down`| Stop all containers                  |
| `npm run seed:articles`| Load sample articles into PostgreSQL |
