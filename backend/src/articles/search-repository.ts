"use strict";

import type { PaginatedArticlesResponse, PaginationCursor } from "@carma/shared";
import type pg from "pg";

import type { CompiledTsQuery } from "../search/types.js";

import {
    buildFilterClauses,
    type ArticleFilters,
} from "./article-filters.js";
import { buildArticlePage } from "./article-page.js";
import {
    ARTICLE_COLUMNS,
    type ArticleDatabaseRow,
} from "./article-row.js";

/**
 * Parameters for executing a boolean article search query.
 */
export interface SearchArticlesParams {
    compiled: CompiledTsQuery;
    filters: ArticleFilters;
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

    const queryParams: Array<string | number | Date | boolean> = [
        ...params.compiled.params,
        ...filterResult.queryParams,
    ];

    const limitParamIndex = filterResult.nextParamIndex;
    queryParams.push(params.limit + 1);

    const searchSql = `
    SELECT ${ARTICLE_COLUMNS}
    FROM articles
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY published_at DESC, id DESC
    LIMIT $${limitParamIndex}
  `;

    const queryResult = await pool.query<ArticleDatabaseRow>(searchSql, queryParams);
    const page = buildArticlePage({
        rows: queryResult.rows,
        limit: params.limit,
    });

    return page;
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
