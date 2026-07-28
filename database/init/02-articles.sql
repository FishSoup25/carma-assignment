-- Articles table: raw sample data + LLM enrichment + full-text search vector

CREATE TYPE sentiment_type AS ENUM ('positive', 'negative', 'neutral', 'mixed');

CREATE TABLE articles (
  id              INTEGER PRIMARY KEY,
  headline        TEXT,
  body            TEXT,
  source          TEXT NOT NULL,
  published_at    TIMESTAMPTZ NOT NULL,
  language        TEXT NOT NULL,
  model_handle    TEXT,
  summary         TEXT,
  sentiment       sentiment_type,
  topic_tags      TEXT[],
  enriched_at     TIMESTAMPTZ,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  cost_usd        NUMERIC(10, 6),
  search_vector   TSVECTOR
);

-- Build a weighted tsvector from headline, body, summary, and topic tags.
-- Uses a trigger because to_tsvector/setweight are not immutable and cannot
-- be used in a GENERATED ALWAYS AS column.
CREATE OR REPLACE FUNCTION articles_search_vector_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.headline, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.body, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.summary, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.topic_tags, ' '), '')), 'C');

  RETURN NEW;
END;
$$;

CREATE TRIGGER articles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF headline, body, summary, topic_tags
  ON articles
  FOR EACH ROW
  EXECUTE FUNCTION articles_search_vector_update();

CREATE INDEX articles_published_at_id_idx ON articles (published_at DESC, id DESC);
CREATE INDEX articles_source_idx ON articles (source);
CREATE INDEX articles_language_idx ON articles (language);
CREATE INDEX articles_search_vector_idx ON articles USING GIN (search_vector);
