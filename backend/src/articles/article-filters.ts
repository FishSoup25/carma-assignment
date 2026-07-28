"use strict";

import type { PaginationCursor, Sentiment } from "@carma/shared";

/**
 * Optional filters applied to article list, search, and aggregate queries.
 */
export interface ArticleFilters {
    source?: string;
    language?: string;
    sentiment?: Sentiment;
    topicTag?: string;
    dateFrom?: string;
    dateTo?: string;
    enriched?: boolean;
}

/**
 * Parameters for building filter and cursor WHERE clauses.
 */
export interface BuildFilterClausesParams {
    filters: ArticleFilters;
    cursor?: PaginationCursor;
    startParamIndex: number;
}

/**
 * Built WHERE clause fragments and bind parameters.
 */
export interface BuiltFilterClauses {
    whereClauses: string[];
    queryParams: Array<string | number | Date | boolean>;
    nextParamIndex: number;
}

/**
 * Build WHERE clause fragments and bind parameters for article filters.
 */
export function buildFilterClauses(params: BuildFilterClausesParams): BuiltFilterClauses {
    const whereClauses: string[] = [];
    const queryParams: Array<string | number | Date | boolean> = [];
    let paramIndex = params.startParamIndex;

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

    if (params.filters.sentiment !== undefined) {
        whereClauses.push(`sentiment = $${paramIndex}::sentiment_type`);
        queryParams.push(params.filters.sentiment);
        paramIndex = paramIndex + 1;
    }

    if (params.filters.topicTag !== undefined) {
        whereClauses.push(`$${paramIndex} = ANY(topic_tags)`);
        queryParams.push(params.filters.topicTag);
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

    if (params.filters.enriched === true) {
        whereClauses.push("enriched_at IS NOT NULL");
    }

    if (params.filters.enriched === false) {
        whereClauses.push("enriched_at IS NULL");
    }

    if (params.cursor !== undefined) {
        whereClauses.push(`(published_at, id) < ($${paramIndex}, $${paramIndex + 1})`);
        queryParams.push(params.cursor.published_at);
        queryParams.push(params.cursor.id);
        paramIndex = paramIndex + 2;
    }

    const result: BuiltFilterClauses = {
        whereClauses,
        queryParams,
        nextParamIndex: paramIndex,
    };

    return result;
}
