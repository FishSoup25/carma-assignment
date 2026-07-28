"use strict";

import type { PaginatedArticlesResponse, PaginationCursor } from "@carma/shared";
import type pg from "pg";

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

    const fetchLimit = params.limit + 1;
    const limitParamIndex = filterResult.nextParamIndex;
    const queryParams: Array<string | number | Date | boolean> = [...filterResult.queryParams];
    queryParams.push(fetchLimit);

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
