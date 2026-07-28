"use strict";

import type { Article, ArticleEnrichment } from "@carma/shared";
import type pg from "pg";

import {
    ARTICLE_COLUMNS,
    mapArticleRow,
    type ArticleDatabaseRow,
} from "../articles/article-row.js";

import type { ArticleEnrichmentInput, EnrichmentFields, LlmUsage } from "./types.js";

/**
 * Load an article by id for enrichment processing.
 */
export async function loadArticleForEnrichment(
    pool: pg.Pool,
    articleId: number,
): Promise<Article | null> {
    const loadSql = `
    SELECT ${ARTICLE_COLUMNS}
    FROM articles
    WHERE id = $1
  `;

    const queryResult = await pool.query<ArticleDatabaseRow>(loadSql, [articleId]);

    if (queryResult.rows.length === 0) {
        return null;
    }

    const article = mapArticleRow(queryResult.rows[0]);
    return article;
}

/**
 * Parameters for persisting enrichment results on an article.
 */
export interface SaveArticleEnrichmentParams {
    articleId: number;
    modelHandle: string;
    fields: EnrichmentFields;
    usage: LlmUsage;
}

/**
 * Persist enrichment fields and telemetry on an article row.
 */
export async function saveArticleEnrichment(
    pool: pg.Pool,
    params: SaveArticleEnrichmentParams,
): Promise<Article> {
    const updateSql = `
    UPDATE articles
    SET
      model_handle = $2,
      summary = $3,
      sentiment = $4::sentiment_type,
      topic_tags = $5,
      enriched_at = NOW(),
      prompt_tokens = $6,
      completion_tokens = $7,
      cost_usd = $8
    WHERE id = $1
    RETURNING ${ARTICLE_COLUMNS}
  `;

    const queryResult = await pool.query<ArticleDatabaseRow>(updateSql, [
        params.articleId,
        params.modelHandle,
        params.fields.summary,
        params.fields.sentiment,
        params.fields.topic_tags,
        params.usage.prompt_tokens,
        params.usage.completion_tokens,
        params.usage.cost_usd,
    ]);

    const article = mapArticleRow(queryResult.rows[0]);
    return article;
}

/**
 * Sum enrichment costs recorded today for the daily budget guard.
 */
export async function sumTodayEnrichmentCost(pool: pg.Pool): Promise<number> {
    const sumSql = `
    SELECT COALESCE(SUM(cost_usd), 0)::text AS total_cost
    FROM articles
    WHERE enriched_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
      AND enriched_at < date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'
  `;

    const queryResult = await pool.query<{ total_cost: string }>(sumSql);
    const totalCost = Number(queryResult.rows[0]?.total_cost ?? "0");

    return totalCost;
}

/**
 * Build ArticleEnrichmentInput from a loaded article row.
 */
export function toEnrichmentInput(article: Article): ArticleEnrichmentInput {
    const input: ArticleEnrichmentInput = {
        id: article.id,
        headline: article.headline,
        body: article.body,
        language: article.language,
    };

    return input;
}

/**
 * Build ArticleEnrichment from a persisted article row.
 */
export function toArticleEnrichment(article: Article): ArticleEnrichment | null {
    if (
        article.summary === null
        || article.sentiment === null
        || article.topic_tags === null
        || article.model_handle === null
        || article.enriched_at === null
    ) {
        return null;
    }

    const enrichment: ArticleEnrichment = {
        summary: article.summary,
        sentiment: article.sentiment,
        topic_tags: article.topic_tags,
        model_handle: article.model_handle,
        enriched_at: article.enriched_at,
    };

    return enrichment;
}

/**
 * Determine whether an article already has enrichment data.
 */
export function isArticleEnriched(article: Article): boolean {
    const enriched = article.summary !== null
        && article.sentiment !== null
        && article.topic_tags !== null
        && article.enriched_at !== null;

    return enriched;
}
