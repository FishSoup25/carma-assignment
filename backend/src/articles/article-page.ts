"use strict";

import type { PaginatedArticlesResponse, PaginationCursor } from "@carma/shared";

import { mapArticleRow, type ArticleDatabaseRow } from "./article-row.js";

/**
 * Parameters for assembling a keyset-paginated article page.
 */
export interface BuildArticlePageParams {
    rows: ArticleDatabaseRow[];
    limit: number;
}

/**
 * Assemble a paginated response from rows fetched with `limit + 1` look-ahead.
 *
 * Queries request one row beyond the page size so the extra row signals that
 * more results exist without a second COUNT query. That row is dropped here and
 * the cursor is taken from the last row actually returned.
 */
export function buildArticlePage(params: BuildArticlePageParams): PaginatedArticlesResponse {
    const hasMore = params.rows.length > params.limit;
    const pageRows = hasMore ? params.rows.slice(0, params.limit) : params.rows;

    const items: PaginatedArticlesResponse["items"] = [];

    for (const row of pageRows) {
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
