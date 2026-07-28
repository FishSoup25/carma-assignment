"use strict";

import type { Article, PaginatedArticlesResponse, PaginationCursor } from "@carma/shared";
import type pg from "pg";

import type { CompiledTsQuery } from "../search/types.js";

const ARTICLE_COLUMNS = `
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
 * Optional filters applied alongside a boolean search query.
 */
export interface SearchFilters {
    source?: string;
    language?: string;
    dateFrom?: string;
    dateTo?: string;
}

/**
 * Parameters for executing a boolean article search query.
 */
export interface SearchArticlesParams {
    compiled: CompiledTsQuery;
    filters: SearchFilters;
    cursor?: PaginationCursor;
    limit: number;
}

interface ArticleDatabaseRow {
    id: number;
    headline: string | null;
    body: string | null;
    source: string;
    published_at: Date;
    language: string;
    model_handle: string | null;
    summary: string | null;
    sentiment: Article["sentiment"];
    topic_tags: string[] | null;
    enriched_at: Date | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    cost_usd: string | null;
}

/**
 * Map a database row to the shared Article interface.
 */
function mapArticleRow(row: ArticleDatabaseRow): Article {
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

interface BuiltSearchClauses {
    whereClauses: string[];
    queryParams: Array<string | number | Date>;
    nextParamIndex: number;
}

/**
 * Build WHERE clause fragments and bind parameters for a search query.
 */
function buildSearchClauses(params: SearchArticlesParams): BuiltSearchClauses {
    const whereClauses: string[] = [`search_vector @@ (${params.compiled.sql})`];
    const queryParams: Array<string | number | Date> = [];

    for (const compiledParam of params.compiled.params) {
        queryParams.push(compiledParam);
    }

    let paramIndex = params.compiled.nextParamIndex;

    if (params.filters.source !== undefined) {
        whereClauses.push(`source = $${paramIndex}`);
        queryParams.push(params.filters.source);
        paramIndex = paramIndex + 1;
    }

    if (params.filters.language !== undefined) {
        whereClauses.push(`language = $${paramIndex}`);
        queryParams.push(params.filters.language);
        paramIndex = paramIndex + 1;
    }

    if (params.filters.dateFrom !== undefined) {
        whereClauses.push(`published_at >= $${paramIndex}`);
        queryParams.push(params.filters.dateFrom);
        paramIndex = paramIndex + 1;
    }

    if (params.filters.dateTo !== undefined) {
        whereClauses.push(`published_at <= $${paramIndex}`);
        queryParams.push(params.filters.dateTo);
        paramIndex = paramIndex + 1;
    }

    if (params.cursor !== undefined) {
        whereClauses.push(`(published_at, id) < ($${paramIndex}, $${paramIndex + 1})`);
        queryParams.push(params.cursor.published_at);
        queryParams.push(params.cursor.id);
        paramIndex = paramIndex + 2;
    }

    const result = {
        whereClauses,
        queryParams,
        nextParamIndex: paramIndex,
    };

    return result;
}

/**
 * Search articles using a compiled boolean query and optional filters.
 */
export async function searchArticles(
    pool: pg.Pool,
    params: SearchArticlesParams,
): Promise<PaginatedArticlesResponse> {
    const clauseResult = buildSearchClauses(params);
    const fetchLimit = params.limit + 1;
    const limitParamIndex = clauseResult.nextParamIndex;

    const searchSql = `
    SELECT ${ARTICLE_COLUMNS}
    FROM articles
    WHERE ${clauseResult.whereClauses.join(" AND ")}
    ORDER BY published_at DESC, id DESC
    LIMIT $${limitParamIndex}
  `;

    const queryParams = [...clauseResult.queryParams, fetchLimit];
    const queryResult = await pool.query<ArticleDatabaseRow>(searchSql, queryParams);

    let hasMore = false;
    let resultRows = queryResult.rows;

    if (resultRows.length > params.limit) {
        hasMore = true;
        resultRows = resultRows.slice(0, params.limit);
    }

    const items: Article[] = [];

    for (const row of resultRows) {
        items.push(mapArticleRow(row));
    }

    let nextCursor: PaginationCursor | null = null;

    if (hasMore && items.length > 0) {
        const lastItem = items[items.length - 1];
        nextCursor = {
            published_at: lastItem.published_at,
            id: lastItem.id,
        };
    }

    const response: PaginatedArticlesResponse = {
        items,
        next_cursor: nextCursor,
        has_more: hasMore,
    };

    return response;
}

/**
 * Render a compiled tsquery SQL expression to its text form in PostgreSQL.
 */
export async function renderCompiledTsQuery(
    pool: pg.Pool,
    compiled: CompiledTsQuery,
): Promise<string> {
    const renderSql = `SELECT (${compiled.sql})::text AS tsquery_text`;
    const renderResult = await pool.query<{ tsquery_text: string | null }>(
        renderSql,
        compiled.params,
    );

    const rendered = renderResult.rows[0]?.tsquery_text ?? "";
    return rendered;
}

/**
 * Count articles in the database, used by integration test setup checks.
 */
export async function countArticles(pool: pg.Pool): Promise<number> {
    const countResult = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM articles");
    const countValue = Number(countResult.rows[0]?.count ?? "0");
    return countValue;
}

/**
 * Verify the articles table exists after hostile input attempts.
 */
export async function articlesTableExists(pool: pg.Pool): Promise<boolean> {
    const existenceResult = await pool.query<{ exists: boolean }>(
        "SELECT to_regclass('public.articles') IS NOT NULL AS exists",
    );

    const exists = existenceResult.rows[0]?.exists ?? false;
    return exists;
}
