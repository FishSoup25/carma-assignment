# Frontend application plan
_Exported on 7/29/2026 at 11:46:36 GMT+2 from Cursor (3.10.15)_

---

**User**

So the next task will be building the front end of our application. It should expose all the core functionality of our application. It should expose the seed script button so we can see the data in our database. It should expose the search page, refer to the assignment PDF for more information on that. Aggregate view. I want to have a button to enrich a specific article. If article has already been enriched, we will show a message, hey, it's already been enriched, do we want to enrich it again? And then overwrite the data. And I also want to include some component that shows a price estimate for the articles as requested by the assignment. Create a plan for the frontend for application. Keep it simple, minimalistic, no crazy UI, just use black and white wireframes style, I would say. Ask any questions about the frontend. So we cover all the required functionality for the frontend and the required implementation that we need. Do not write any tests or integration tests for the frontend. I will just test the frontend functionality myself

---

**Cursor**

I'll start by exploring the codebase and the assignment PDF to understand what's needed.

Let me read the assignment PDF and explore the backend in parallel.

I've read the assignment and mapped the backend. Before planning, a few things need your call — notably that some frontend features have no backend endpoint yet.

Current backend surface is only four routes: `GET /health`, `GET /api/articles/search`, `GET /api/articles/search/parse`, `POST /api/articles/:id/enrich?force=true`. There is **no** article list endpoint (search requires `q`), **no** aggregate endpoint, **no** seed endpoint (seeding is CLI-only via `npm run seed:articles`), and **no** cost-estimate endpoint. So the features you described require backend work too.

The good news: the enrich-again flow is already supported — enriching an already-enriched article returns `cached: true` without calling the LLM, and `?force=true` overwrites. That maps exactly onto your confirm dialog.

**Frontend plan decisions**

> **The frontend needs backend endpoints that don't exist yet. Which should this plan include? (The first two are also explicitly required by the assignment's Data Layer section.)**
> - All four: article list, aggregate counts, seed trigger, cost estimate (Recommended) ✔
> - List + aggregate + seed only (compute price estimate client-side from a pricing constant)
> - List + aggregate only (no seed button; I'll seed via CLI)
> - Frontend only - work around gaps (e.g. list via a wildcard search, aggregate computed in the browser)

> **Your coding rules forbid .map()/.forEach(). React list rendering normally uses .map() in JSX. How should I handle this?**
> - Allow .map() for JSX rendering only; keep for-of everywhere else (Recommended) ✔
> - Strictly no .map() - build ReactNode[] arrays with for-of loops in named helper functions

> **Dependencies for the aggregate chart and page navigation? (You asked for minimal black-and-white wireframe styling.)**
> - Zero new deps: CSS bar chart + table, tab switching via useState, hand-written CSS (Recommended) ✔
> - Add react-router-dom for real URLs/deep links, but keep the CSS bar chart
> - Add react-router-dom + recharts for a proper chart component

> **The sample data has deliberate HTML/script injection (articles 6 and 18). How much should the UI show of article bodies?**
> - Render headline/body as plain text via React escaping, show a truncated excerpt with expand toggle (Recommended) ✔
> - Show only the LLM summary in the list; never render raw body text
> - Show full body text (still escaped) on every card

All four endpoints, `.map()` in JSX only, zero new deps, escaped text excerpts. Let me read the key backend files so the new endpoints match existing patterns.

I have what I need. One correction to note: `src/assets/hero.png` does exist, so the current boilerplate builds fine — it just needs replacing.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I'll implement the plan end-to-end, starting with the backend shared refactor.

I'll start with shared types and the backend article-row / filters refactor.

I put enrichment-repository in the wrong folder — fixing that now.

Next up: list, aggregate, and facets repositories plus their validation schemas.

Building the frontend foundation next: styles, API client, hooks, and layout.

Splitting the common components into separate files for cleaner imports.

Cleaning up boilerplate and fixing a few component issues before lint/build.

Fixing the lint error and trimming the longer components.

Refactoring the cost-estimate service to bring complexity under the limit.

Lint and builds are clean. Updating the README, then smoke-testing the new endpoints.

An old backend is still bound to port 3000 — restarting it with the new routes.

---

**User**

assign a different port for the dev server, choose 4474

---

**Cursor**

I'll switch the backend (and the frontend API base URL) to port 4474 so we can start cleanly.

Backend now listens on **4474**. Updated:

- `backend/.env` / `.env.example` → `PORT=4474`
- `frontend/.env` / `.env.example` → `VITE_API_BASE_URL=http://localhost:4474`
- Vite proxy targets, README, Dockerfile `EXPOSE`, docker-compose mapping

Server is up and the new endpoints respond (list, aggregate, cost-estimate, seed). Frontend still on http://localhost:5173 — restart `npm run dev:frontend` if it was already running so it picks up the new env.

---

**User**

can you replace iso dates input field with a simple date picker

---

**Cursor**

I'll swap the ISO text fields for native date pickers and convert to/from the API's datetime format.

Done. The From/To fields on Articles, Search, and Aggregate now use native `type="date"` pickers. Selected days are converted to start/end-of-day ISO timestamps before hitting the API.

---

**User**

reuse the filters component from search to aggregate, keep granulatiry as a separate item

---

**Cursor**

I'll reuse `FilterBar` on Aggregate and keep granularity as its own control.

Aggregate now uses the shared `FilterBar` (source, language, sentiment, date range). Granularity stays separate in `GranularityControls` with month/week and Refresh. The old aggregate-only filter UI was removed.

---

**User**

can you add "Enrich all remaining articles" button

---

**Cursor**

I'll add an "Enrich all remaining" control on the Articles page that walks unenriched articles and enriches them one by one.

Added **Enrich all remaining articles** on the Articles tab, under the seed panel.

It loads unenriched article IDs, enriches them one by one, shows progress (`Enriching article #N (3/19)...`), and stops early on missing API key, daily budget, or rate limits. When finished, the article list refreshes.

---

**User**

verify if something is preventing us from enriching all the articles concurently, the fix the enrich all to enrich articles concurently

---

**Cursor**

I'll check the enrichment path for anything that blocks concurrent runs, then switch "enrich all" to fire requests in parallel.

Nothing on the backend serializes enrichment — only the frontend awaits one article at a time. Daily budget is a soft pre-check (TOCTOU under concurrency), and OpenRouter may 429 with retries. Updating enrich-all to run concurrently.

Extracting the batch runner to clear the length warnings.

Cleaning up a duplicate concurrent loop I left in the runner.

Replacing `.then()` to match the project async style.

**Findings:** Nothing on the backend blocked concurrent enrichment — no mutex, queue, or single-flight lock. The only hard limit was the frontend awaiting each article one at a time. Soft constraints that can still affect parallel runs:

- Daily budget is checked before each LLM call (TOCTOU under concurrency; some requests may slip past)
- OpenRouter may return 429 (client already retries)

**Fix:** Enrich-all now fires all unenriched articles with `Promise.all`, updates progress as each settles, and summarizes failures (budget / rate limit / missing key) without aborting the whole batch.

---

**User**

how is cost estimate stored on the frontend? I just deleted all the articles and cost remained. We need the cost to be calculated from the average of article costs and show 0 if no articles are present/enriched

---

**Cursor**

I'll check how the cost estimate is computed and why it stays non-zero with no articles.

Cost isn’t cached on the frontend — it’s fetched from the API. The backend falls back to a length heuristic when nothing is enriched, so costs stay non-zero. I’ll switch it to `AVG(cost_usd)` and return zeros when there are no enriched articles.

