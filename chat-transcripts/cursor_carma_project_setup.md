# CARMA project setup
_Exported on 7/29/2026 at 11:45:09 GMT+2 from Cursor (3.10.15)_

---

**User**

This is an empty project for the CARMA Senior Fullstack Engineer
Home Assignment. The first task will be setting up the project, creating main folder structure and generating base files. This will be developed as a monorepo.  We will have 3 main folders - one for dockerized postgress, one for node js backend, and one for vite js frontend. We will also have a folder for types that will be shared across the frontend and backend. Setup each folder and base files, vite and node should have eslint, all 3 should have .env, setup gitignore, docker compose files. Fir vite use official vite template https://vite.dev/guide/ 

---

**Cursor**

I'll start by reviewing the assignment and current project layout, then scaffold the monorepo structure with Docker, backend, frontend, and shared types.


Scaffolding the monorepo: creating the 

root workspace, then generating the Vite frontend and backend packages.


The latest Vite template ships with oxlint; I'll add ESLint to the frontend and backend as requested.


Fixing the backend build config and installing dependencies to verify the setup.


The monorepo is scaffolded and verified — `npm install`, `npm run lint`, and `npm run build` all pass.

## Project Structure

```
carma-testing/
├── database/          # Dockerized PostgreSQL
│   ├── .env
│   ├── .env.example
│   └── init/01-init.sql
├── backend/           # Node.js + Express API (TypeScript)
│   ├── .env / .env.example
│   ├── eslint.config.js
│   ├── Dockerfile
│   └── src/index.ts   # health check endpoint
├── frontend/          # Vite + React + TypeScript (official template)
│   ├── .env / .env.example
│   ├── eslint.config.js
│   ├── Dockerfile
│   └── vite.config.ts # API proxy + shared types alias
├── shared/            # Shared types (@carma/shared)
│   └── src/index.ts   # Article, Enrichment, Pagination, etc.
├── docker-compose.yml
├── package.json       # npm workspaces root
├── .gitignore
└── README.md
```

## What's Configured

| Area | Details |
|------|---------|
| **Monorepo** | npm workspaces linking `frontend`, `backend`, and `shared` |
| **Frontend** | Official Vite `react-ts` template; ESLint (flat config) replaces the template's oxlint |
| **Backend** | Express + TypeScript + ESLint; `tsx watch` for dev |
| **Shared types** | `@carma/shared` with assignment-relevant interfaces (Article, Enrichment, Pagination, etc.) |
| **Database** | PostgreSQL 16 via Docker; init script enables `pg_trgm` for future search |
| **Docker Compose** | Postgres starts by default; backend/frontend use `--profile full` |
| **Env files** | `.env` + `.env.example` in `database/`, `backend/`, and `frontend/` |

## Getting Started

```bash
npm install
npm run docker:up          # Start PostgreSQL
npm run dev:backend        # http://localhost:3000
npm run dev:frontend       # http://localhost:5173
```

For the full stack in Docker:

```bash
docker compose --profile full up --build
```

The frontend proxies `/api/*` to the backend, and both packages can import from `@carma/shared`. Ready for the next task — schema design and data loading.

