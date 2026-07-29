# Boolean search implementation plan
_Exported on 7/29/2026 at 11:46:22 GMT+2 from Cursor (3.10.15)_

---

**User**

So for next task we're going to implement the Boolean search, we're going to create the required functionality in our backend server of the project, and we're going to create our own boolean parser and expose the API so it can be used for both testing and Frontend for our application later. I will need you to plan this implementation. we need to make sure that our API Is input safe. in the future I plan on using ZOD for data verification of LLM request responses. So you can also use that for this verification to keep the stack simple. You need to create the logic, the functionality create some Integration testing That tries to filter something from our existing database.@documents/Senior-Fullstack-Home-Assignment.pdf 

---

**Cursor**

I'll start by reading the assignment PDF and exploring the current state of the project.

Now let me examine the backend and database structure.

I've reviewed the brief, the schema, and the current backend. A few things I found that shape the plan:

- The backend only has `/health` — the paginated list and aggregate endpoints from task 1 don't exist yet, and there's no `pg` pool module or router layer.
- The schema already has a weighted `search_vector` (`tsvector`) with a GIN index, built with the `'simple'` config (no stemming, no stopwords), plus `pg_trgm` installed.
- No test runner and no `zod` anywhere in the lockfile yet.

Three decisions will materially change the plan, so let me confirm them before writing it.

**Boolean search implementation decisions**

> **How should the parsed boolean AST be matched against articles? (The existing search_vector uses the 'simple' config, so no stemming; the Chinese/Arabic articles tokenize poorly under FTS.)**
> - Postgres FTS only (Recommended): compile AST to a tsquery built from bind parameters — to_tsquery/phraseto_tsquery per leaf combined with &&, ||, !! operators. Uses the GIN index, zero string interpolation, prefix wildcards via lexeme:* ✔
> - ILIKE / pg_trgm only: each leaf becomes a parameterized ILIKE on headline/body/summary. Handles substrings and CJK well, but no index use for the general case
> - Hybrid: FTS for plain terms and phrases, ILIKE fallback for wildcards and non-space-delimited languages (zh/ar). Most correct, most code

> **What is in scope for this task besides the parser itself?**
> - Search only (Recommended): GET /api/articles/search with the boolean query, plus the structured filters (date range, source, language) and keyset pagination on the search results ✔
> - Search plus the remaining task-1 endpoints: paginated /api/articles list and the /api/articles/counts monthly aggregate, all sharing one Zod-validated filter layer
> - Parser and validation layer only, no HTTP endpoint yet — expose it as a module plus unit tests

> **Which test runner should I set up for the parser unit tests and the DB integration tests?**
> - Vitest (Recommended): one runner usable by backend and later the frontend, good TS/ESM support out of the box ✔
> - Node built-in node:test + tsx, no extra dependency

Let me check whether the database is currently running, so I can plan the verification step realistically.

Let me verify the exact SQL primitives I intend to generate, so the plan is grounded in tested behavior.

I verified every SQL primitive the plan depends on against the running database, including all three example queries from the brief. Here's the plan.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I'll implement the Boolean Search API per the plan, starting with dependencies and working through each module.


I'll add dependencies and create the core search modules first.


The tokenizer needs a clean rewrite — I'll fix the duplicate logic and simplify prefix handling.


Next I'll add unit and integration tests, then install dependencies and run them.


All 32 tests passed. I'll run lint and build, then update the README.


I'll switch source imports to `.js` extensions for NodeNext build compatibility and fix the tokenizer type error.


Build and tests pass. Updating the README and marking todos complete.


Boolean Search API is implemented per the plan. Summary:

## What was built

**Parser pipeline** (`backend/src/search/`)
- Tokenizer with case-sensitive `AND`/`OR`/`NOT`, phrases, prefix wildcards, and lexeme validation
- Recursive-descent parser with implicit AND and precedence climbing
- Complexity guards (length, depth, leaf count)
- tsquery compiler — all leaves are bind parameters; no user text in SQL

**API layer**
- `GET /api/articles/search` — boolean search with Zod-validated filters and keyset pagination
- `GET /api/articles/search/parse` — debug endpoint returning AST + compiled tsquery
- Centralised error handler mapping `BooleanQueryError` and Zod failures to `ApiErrorResponse`

**Database**
- Uses existing `search_vector` GIN index
- Explicit column list, conditional filter clauses, `(published_at, id)` keyset cursor

**Tests** — 32 passing
- 20 unit tests (tokenizer, parser, compiler)
- 12 integration tests against seeded DB (brief examples, multilingual, filters, pagination, injection attempts)

## Verification

```bash
npm run docker:up
npm run seed:articles
npm run test --workspace=backend
```

Example:

```bash
curl "http://localhost:3000/api/articles/search?q=renewable%20AND%20NOT%20(nuclear%20OR%20coal)"
# → article 5
```

## Input safety

- SQL injection: parameterised queries only
- tsquery injection: `quote_literal(lower($n))` for prefix terms
- Complexity limits + 5s statement timeout
- Root-level negation rejected (can't use GIN index efficiently)

README updated with approach, tradeoffs, and FTS limitations (Chinese partial-token behaviour documented).

