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

- Backend: http://localhost:4474
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
| `npm run enrich:article` | Enrich one article via CLI (`-- --id N [--force]`) |
| `npm run test --workspace=backend` | Run backend unit and integration tests |
| `npm run test:unit --workspace=backend` | Run boolean parser/compiler unit tests only |
| `npm run test:integration --workspace=backend` | Run database-backed search integration tests |

## Frontend UI

The Vite + React UI is a black-and-white wireframe with four tabs:

| Tab | What it does |
|-----|--------------|
| **Articles** | Run the sample seed script, browse the paginated article list with filters, enrich / re-enrich individual articles |
| **Search** | Boolean query input with syntax help and example queries; results show AI summary, sentiment badge, and topic tags when enriched |
| **Aggregate** | Article counts by month or week as a CSS bar chart and table; filterable by source, language, or sentiment |
| **Cost** | LLM price estimate: per-article cost, projected daily cost at 50,000 articles/day, remaining enrichment cost, and active guardrails |

### XSS handling

Article headlines and bodies are rendered as escaped React text children only — never via `dangerouslySetInnerHTML`. Sample articles 6 and 18 contain deliberate HTML/script injection; those payloads appear as visible literal text. Bodies are truncated with an expand/collapse toggle. Headline `null` (article 17) shows `(no headline)`. Arabic content uses `dir="auto"`.

### Enrich overwrite flow

- Not yet enriched: **Enrich** calls `POST /api/articles/:id/enrich`.
- Already enriched: **Re-enrich** shows an inline confirmation asking whether to overwrite, then calls the same endpoint with `?force=true`.

### Seed from the UI

The Articles tab **Run seed script** button calls `POST /api/admin/seed`. Re-seeding upserts content columns and preserves existing enrichment. The endpoint returns `403 seed_disabled` when `NODE_ENV=production`.

## HTTP API

### Article endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/articles` | Keyset-paginated article list (no search query required) |
| `GET` | `/api/articles/search` | Search articles with boolean query syntax |
| `GET` | `/api/articles/search/parse` | Debug endpoint returning AST and compiled tsquery |
| `GET` | `/api/articles/aggregate` | Article counts grouped by month or week |
| `GET` | `/api/articles/facets` | Distinct sources, languages, and topic tags for filters |
| `POST` | `/api/articles/:id/enrich` | Enrich one article (`?force=true` overwrites cached enrichment) |

### Admin and enrichment endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/seed` | Seed sample articles (disabled in production) |
| `GET` | `/api/enrichment/cost-estimate` | Per-article and 50k/day cost projection |
| `GET` | `/health` | Health check |

### List / aggregate parameters

Shared filters (where applicable): `source`, `language`, `sentiment`, `date_from`, `date_to`.

| Parameter | Endpoint(s) | Description |
|-----------|-------------|-------------|
| `limit` | list, search | Page size, 1–100 (default 20) |
| `cursor_published_at` + `cursor_id` | list, search | Keyset cursor pair |
| `enriched` | list | `true` / `false` |
| `granularity` | aggregate | `month` (default) or `week` |
| `topic_tag` | aggregate | Filter to articles containing the tag |
| `force` | enrich | Re-run enrichment and overwrite |

## Boolean Search API

The backend exposes a hand-rolled boolean query parser that compiles to parameterised PostgreSQL full-text search (`tsquery`). No user input is interpolated into SQL; each leaf becomes a bind parameter.

### Query syntax

- **Operators:** `AND`, `OR`, `NOT` (case-sensitive; lowercase `and` is treated as a search term)
- **Implicit AND:** adjacent terms (`renewable energy`) are combined with AND
- **Phrases:** double quotes (`"oil prices"`)
- **Wildcards:** trailing `*` only (`renew*` matches `renewable`, `renewables`, etc.)
- **Nesting:** parentheses (`(a AND (b OR c))`)

Example queries:

```
"oil prices" AND (geopolitical OR "supply chain")
renewable AND NOT (nuclear OR coal)
AI AND ("healthcare" OR "diagnostic") AND NOT startup*
```

### Search parameters

| Parameter | Description |
|-----------|-------------|
| `q` | Boolean query string (required) |
| `limit` | Page size, 1–100 (default 20) |
| `cursor_published_at` | Keyset cursor timestamp (ISO 8601) |
| `cursor_id` | Keyset cursor article id |
| `source` | Filter by source name |
| `language` | Filter by language code |
| `date_from` | Filter published_at >= (ISO 8601) |
| `date_to` | Filter published_at <= (ISO 8601) |

Results are ordered by `published_at DESC, id DESC` (not relevance rank) to support stable keyset pagination.

### Approach and tradeoffs

- **Parser:** Recursive-descent tokenizer/parser produces an AST validated with complexity guards (max length, depth, leaf count).
- **Execution:** AST compiles to `plainto_tsquery` / `phraseto_tsquery` / prefix `to_tsquery` fragments combined with `&&`, `||`, `!!` — all leaves are bind parameters.
- **Index:** Queries use the precomputed `search_vector` GIN index (`simple` config: no stemming, no stopwords).
- **Validation:** Request parameters validated with Zod (same library used for LLM response validation).

**Known FTS limitations:**

- Chinese text tokenises as long clauses under the `simple` config; partial tokens like `科技` may not match unless the indexed clause contains them. Prefix wildcards on longer substrings (e.g. `中国*`) work better.
- Arabic tokenises into individual words and generally works for whole-word matches.
- Root-level negation alone (`NOT nuclear`) is rejected because it cannot efficiently use the GIN index.

### Input safety

- SQL injection: all query values are bind parameters; SQL operators come only from the trusted AST compiler.
- tsquery injection: prefix terms use `quote_literal(lower($n))` so hostile input like `a') | 'b` cannot escape into OR operators.
- Complexity limits: max query length 512, max term length 64, max 64 leaves, max depth 12, 5s statement timeout.

### Running tests

Integration tests require PostgreSQL running with seeded data:

```bash
npm run docker:up
npm run seed:articles
npm run test --workspace=backend
```
