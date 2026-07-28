-- Enrichment telemetry columns for existing volumes (idempotent on fresh installs).

ALTER TABLE articles ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS completion_tokens INTEGER;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10, 6);

CREATE INDEX IF NOT EXISTS articles_enriched_at_idx ON articles (enriched_at DESC);
