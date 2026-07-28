"use strict";

import type { BooleanQueryParseResponse, PaginatedArticlesResponse } from "@carma/shared";
import type pg from "pg";

import type { SearchArticlesQuery } from "../http/validation/search-request.js";

import {
    compileBooleanQuery,
    serializeAstNode,
} from "../search/compile-boolean-query.js";

import {
    renderCompiledTsQuery,
    searchArticles,
    type SearchFilters,
} from "./search-repository.js";

/**
 * Build optional search filters from validated query parameters.
 */
function buildSearchFilters(query: SearchArticlesQuery): SearchFilters {
    const filters: SearchFilters = {};

    if (query.source !== undefined) {
        filters.source = query.source;
    }

    if (query.language !== undefined) {
        filters.language = query.language;
    }

    if (query.date_from !== undefined) {
        filters.dateFrom = query.date_from;
    }

    if (query.date_to !== undefined) {
        filters.dateTo = query.date_to;
    }

    return filters;
}

/**
 * Execute a boolean article search against PostgreSQL.
 */
export async function executeArticleSearch(
    pool: pg.Pool,
    query: SearchArticlesQuery,
): Promise<PaginatedArticlesResponse> {
    const compiledQuery = compileBooleanQuery(query.q);
    const filters = buildSearchFilters(query);

    let cursor = undefined;

    if (query.cursor_published_at !== undefined && query.cursor_id !== undefined) {
        cursor = {
            published_at: query.cursor_published_at,
            id: query.cursor_id,
        };
    }

    const searchResult = await searchArticles(pool, {
        compiled: compiledQuery.compiled,
        filters,
        cursor,
        limit: query.limit,
    });

    return searchResult;
}

/**
 * Parse and compile a boolean query for debug output.
 */
export async function executeBooleanQueryParse(
    pool: pg.Pool,
    queryString: string,
): Promise<BooleanQueryParseResponse> {
    const compiledQuery = compileBooleanQuery(queryString);
    const compiledTsQuery = await renderCompiledTsQuery(pool, compiledQuery.compiled);

    const response: BooleanQueryParseResponse = {
        query: queryString,
        ast: serializeAstNode(compiledQuery.ast),
        compiled_sql: compiledQuery.compiled.sql,
        compiled_tsquery: compiledTsQuery,
    };

    return response;
}
