"use strict";

import type { Article, Sentiment } from "@carma/shared";

/**
 * SQL column list for article select queries.
 */
export const ARTICLE_COLUMNS = `
  id,
  headline,
  body,
  source,
  published_at,
  language,
  model_handle,
  summary,
  sentiment,
  topic_tags,
  enriched_at,
  prompt_tokens,
  completion_tokens,
  cost_usd
`;

/**
 * Raw article row shape returned by PostgreSQL.
 */
export interface ArticleDatabaseRow {
    id: number;
    headline: string | null;
    body: string | null;
    source: string;
    published_at: Date;
    language: string;
    model_handle: string | null;
    summary: string | null;
    sentiment: Sentiment | null;
    topic_tags: string[] | null;
    enriched_at: Date | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    cost_usd: string | null;
}

/**
 * Map a database row to the shared Article interface.
 */
export function mapArticleRow(row: ArticleDatabaseRow): Article {
    let costUsd: number | null = null;

    if (row.cost_usd !== null) {
        costUsd = Number(row.cost_usd);
    }

    const article: Article = {
        id: row.id,
        headline: row.headline,
        body: row.body,
        source: row.source,
        published_at: row.published_at.toISOString(),
        language: row.language,
        model_handle: row.model_handle,
        summary: row.summary,
        sentiment: row.sentiment,
        topic_tags: row.topic_tags,
        enriched_at: row.enriched_at !== null ? row.enriched_at.toISOString() : null,
        prompt_tokens: row.prompt_tokens,
        completion_tokens: row.completion_tokens,
        cost_usd: costUsd,
    };

    return article;
}
