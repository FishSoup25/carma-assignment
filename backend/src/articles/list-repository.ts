"use strict";

import type { PaginatedArticlesResponse, PaginationCursor } from "@carma/shared";
import type pg from "pg";

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
 * Parameters for listing articles with keyset pagination.
 */
export interface ListArticlesParams {
    filters: ArticleFilters;
    cursor?: PaginationCursor;
    limit: number;
}

/**
 * List articles with optional filters using keyset pagination.
 */
export async function listArticles(
    pool: pg.Pool,
    params: ListArticlesParams,
): Promise<PaginatedArticlesResponse> {
    const filterResult = buildFilterClauses({
        filters: params.filters,
        cursor: params.cursor,
        startParamIndex: 1,
    });

    const limitParamIndex = filterResult.nextParamIndex;
    const queryParams: Array<string | number | Date | boolean> = [...filterResult.queryParams];
    queryParams.push(params.limit + 1);

    let whereSql = "";

    if (filterResult.whereClauses.length > 0) {
        whereSql = `WHERE ${filterResult.whereClauses.join(" AND ")}`;
    }

    const listSql = `
    SELECT ${ARTICLE_COLUMNS}
    FROM articles
    ${whereSql}
    ORDER BY published_at DESC, id DESC
    LIMIT $${limitParamIndex}
  `;

    const queryResult = await pool.query<ArticleDatabaseRow>(listSql, queryParams);
    const page = buildArticlePage({
        rows: queryResult.rows,
        limit: params.limit,
    });

    return page;
}
