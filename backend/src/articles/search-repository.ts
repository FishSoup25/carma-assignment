"use strict";

import type { PaginatedArticlesResponse, PaginationCursor } from "@carma/shared";
import type pg from "pg";

import type { CompiledTsQuery } from "../search/types.js";

import {
    buildFilterClauses,
    type ArticleFilters,
} from "./article-filters.js";
import {
    ARTICLE_COLUMNS,
    mapArticleRow,
    type ArticleDatabaseRow,
} from "./article-row.js";

/**
 * Optional filters applied alongside a boolean search query.
 */
export type SearchFilters = ArticleFilters;

/**
 * Parameters for executing a boolean article search query.
 */
export interface SearchArticlesParams {
    compiled: CompiledTsQuery;
    filters: SearchFilters;
    cursor?: PaginationCursor;
    limit: number;
}

/**
 * Search articles using a compiled boolean query and optional filters.
 */
export async function searchArticles(
    pool: pg.Pool,
    params: SearchArticlesParams,
): Promise<PaginatedArticlesResponse> {
    const filterResult = buildFilterClauses({
        filters: params.filters,
        cursor: params.cursor,
        startParamIndex: params.compiled.nextParamIndex,
    });

    const whereClauses: string[] = [`search_vector @@ (${params.compiled.sql})`];

    for (const clause of filterResult.whereClauses) {
        whereClauses.push(clause);
    }

    const queryParams: Array<string | number | Date | boolean> = [];

    for (const compiledParam of params.compiled.params) {
        queryParams.push(compiledParam);
    }

    for (const filterParam of filterResult.queryParams) {
        queryParams.push(filterParam);
    }

    const fetchLimit = params.limit + 1;
    const limitParamIndex = filterResult.nextParamIndex;

    const searchSql = `
    SELECT ${ARTICLE_COLUMNS}
    FROM articles
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY published_at DESC, id DESC
    LIMIT $${limitParamIndex}
  `;

    queryParams.push(fetchLimit);
    const queryResult = await pool.query<ArticleDatabaseRow>(searchSql, queryParams);

    let hasMore = false;
    let resultRows = queryResult.rows;

    if (resultRows.length > params.limit) {
        hasMore = true;
        resultRows = resultRows.slice(0, params.limit);
    }

    const items: PaginatedArticlesResponse["items"] = [];

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
