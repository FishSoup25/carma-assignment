# AI LLM integration plan
_Exported on 7/29/2026 at 11:46:31 GMT+2 from Cursor (3.10.15)_

---

**User**

So for the next task we are going to tackle the AI LLM integration and the enrichment process. We're going to use the open router and for enrichment we're going to use the following model - "qwen/qwen3.6-35b-a3b"

I need you to create a plan how we're going to implement this. Basically we're going to expose an enrichment API endpoint that will be accessed by tests frontend. Don't add integration tests that actually call the LLM API endpoint as to not waste funds and tokens, but include the npm command that I can run to enrich a specific article. I'm just going to give the article ID and we're going to enrich it. Write the prompts to prevent the prompt injection from the article text. Always structure the prompt such that the fixed data stays at the beginning while the variable data stays at the end, so we get a better cache hit on the model. Also, we need to implement the Zod verification schema. We always gonna request a proper JSON response from the model. And we always need to verify that the model actually responded with the JSON we require. If we receive something else in return, it must fail and not go further. Also read the relevant task documentation. We need to add the safety guards into the article sizes. If any of the article fields to the ALM model, we're going to pass the headline and body. We need to verify that those are within the size limits that we specified to prevent sending unresolved large payload to the model.

Also update the .env example. Right now it's specific to the OpenAI endpoint, replace it with OpenRouter naming. Update the .env example and I will update the .env file.

---

**Cursor**

I'll start by exploring the codebase and reading the task documentation.

Let me verify the model on OpenRouter and read a few key files myself.

Now let me verify the model slug on OpenRouter and check its structured-output support.

I've got the full picture: Express + `pg` + Zod backend, `articles` table already has `model_handle`, `summary`, `sentiment`, `topic_tags` columns, and the assignment requires summary + sentiment (positive/negative/neutral/mixed) + 1-3 topic tags, plus at least one cost guardrail and a prompt-injection mitigation.

I confirmed `qwen/qwen3.6-35b-a3b` is live on OpenRouter: 262k context, supports `response_format` **and** `structured_outputs` (strict JSON schema), priced at $0.10/M prompt, $1.00/M completion, $0.05/M cached prompt reads — so your fixed-prefix-first caching strategy will pay off directly.

Three decisions shape the plan significantly:

**Enrichment design decisions**

> **What shape should the enrichment endpoint take?**
> - POST /api/articles/:id/enrich — single article, synchronous, persists to DB, returns the enriched article. Skips re-calling the LLM if already enriched unless ?force=true (Recommended) ✔
> - Same as above, plus a capped batch endpoint POST /api/articles/enrich accepting an array of IDs
> - Stateless — call the LLM and return the enrichment in the response without writing to the DB

> **When an article's headline/body exceeds the size limits, what should happen?**
> - Two tiers: hard-reject with 413 above an absolute max (e.g. body > 40k chars), and truncate at a soft cap (e.g. 8k chars) on a sentence boundary, flagging it as truncated (Recommended — truncation doubles as the token-budget guardrail)
> - Always reject with 413 if outside limits — never truncate, never send a partial article
> - Always truncate to the cap, no rejection path ✔

> **Should I add enrichment metadata columns to the articles table (new database/init/03-enrichment.sql)?**
> - Yes: enriched_at, content_hash (duplicate detection), prompt_tokens, completion_tokens, cost_usd — gives you real cost telemetry for the README's LLM Cost Analysis section (Recommended)
> - Minimal: just enriched_at and content_hash
> - No schema change — only write the existing model_handle, summary, sentiment, topic_tags columns
>
> Answer: add enriched at, prompt tokens, completion tokens, cost usd, do not add content hash

I have everything I need. Here's the plan.

---

**User**

specify that the model shall be instructed to always otput summaries, tags, and sentiment must always be returned in english, not article language

---

**Cursor**

I'll add that requirement to the plan.

The plan now enforces English-only output at three levels rather than just asking the model nicely:

1. **Static system prompt clause** — `summary`, `topic_tags`, and `sentiment` must always be English regardless of article language; read the article in its original language, report on it in English, transliterate proper nouns rather than translating them. Because this lives in the cached static prefix, it costs nothing per article.
2. **The few-shot example is now deliberately non-English** — a short foreign-language snippet paired with an English JSON answer, so the cross-lingual behavior is demonstrated, not just described. Also free, since it is part of the cached prefix.
3. **A hard post-validation guard** — new `language-guard.ts` with `assertEnglishOutput`, checking `summary` and each tag against a non-Latin script regex (Arabic, Hebrew, Han, Hiragana, Katakana, Hangul, Cyrillic, Greek, Devanagari, Thai). A hit throws the new `llm_non_english_output` code, maps to 502, and nothing is persisted — same hard-fail rule as malformed JSON.

This matters concretely for your seed data: article 8 is Arabic and article 9 is Chinese, so without this the summaries would land in the database in mixed languages and pollute the shared `topic_tags` taxonomy and the `search_vector`. Tests cover it without any network calls: a dedicated `language-guard.test.ts`, a non-English summary case in the parse tests, and an integration case that enriches article 8 with a mocked Arabic reply and expects a 502.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I'll implement the enrichment pipeline per the plan, starting with env config and database migrations.


Creating the core enrichment module files and updating config, database, and shared types.


Updating the search repository for the new Article fields, then adding the CLI script and tests.


Running tests and lint to verify everything works.


Fixing the Vitest mock hoisting issue and applying the database migration so integration tests can run.


Fixing lint errors.


Lint is clean. Running the full test suite.


LLM enrichment via OpenRouter is implemented. Summary:

## What was built

**Endpoint:** `POST /api/articles/:id/enrich`
- Optional `?force=true` to re-enrich
- Returns `ArticleEnrichmentResponse` with `article`, `enrichment`, `usage`, `cached`, `truncated`
- Skips the LLM if already enriched (unless `force=true`)

**Enrichment module** (`backend/src/enrichment/`):
- OpenRouter client with strict JSON schema, `reasoning: { enabled: false }`, timeout, retries on 429/5xx
- Cache-aligned prompt: static system + few-shot prefix, article last in `<ARTICLE_INPUT>` markers
- English-only output enforced in prompt, few-shot example, and `language-guard.ts` post-validation
- Input sanitization (HTML/script/marker stripping) and truncation (512 headline / 8000 body chars)
- Strict Zod + JSON Schema validation — hard-fail on any non-conforming response
- Cost guardrails: daily budget, `max_tokens`, skip-if-enriched, per-request cost telemetry

**Database:** Added `enriched_at`, `prompt_tokens`, `completion_tokens`, `cost_usd` to `02-articles.sql` and idempotent `03-enrichment.sql` for existing volumes.

**CLI:**
```bash
npm run enrich:article -- --id 3
npm run enrich:article -- --id 3 --force
npm run enrich:article -- --id 3 --dry-run   # inspect prompt, no API call
```

## Your next steps

1. Copy OpenRouter vars from [`backend/.env.example`](backend/.env.example) into `backend/.env` and set `OPENROUTER_API_KEY`.
2. Apply migration on an existing DB (already applied in this environment):
   ```bash
   docker compose exec -T postgres psql -U carma -d carma -f - < database/init/03-enrichment.sql
   ```

## Tests

All **72 tests pass** (54 unit + 18 integration). Integration tests mock OpenRouter — no tokens spent.

To enrich article 3 for real after configuring your key:
```bash
npm run enrich:article -- --id 3
```

---

**User**

remove the OPENROUTER_APP_URL and OPENROUTER_APP_TITLE from env and functionality related to it

---

**Cursor**

I'll find and remove all references to `OPENROUTER_APP_URL` and `OPENROUTER_APP_TITLE`.


Removed `OPENROUTER_APP_URL` and `OPENROUTER_APP_TITLE` from:

- [`backend/.env.example`](backend/.env.example) — dropped the optional attribution header vars and their comment
- [`backend/src/enrichment/config.ts`](backend/src/enrichment/config.ts) — removed from the Zod schema, `EnrichmentConfig` interface, and config loader
- [`backend/src/enrichment/openrouter-client.ts`](backend/src/enrichment/openrouter-client.ts) — no longer sends `HTTP-Referer` or `X-Title` headers

Your `backend/.env` already had those removed. All 72 tests still pass.

