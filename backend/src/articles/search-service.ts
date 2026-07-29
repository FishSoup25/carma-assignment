"use strict";

import type {
    ArticleCountsResponse,
    ArticleFacetsResponse,
    ArticleFilterQuery,
    BooleanQueryParseResponse,
    PaginatedArticlesResponse,
    PaginationCursor,
} from "@carma/shared";
import type pg from "pg";

import type {
    AggregateArticlesQuery,
    ListArticlesQuery,
} from "../http/validation/article-list-request.js";
import type { SearchArticlesQuery } from "../http/validation/search-request.js";
import {
    compileBooleanQuery,
    serializeAstNode,
} from "../search/compile-boolean-query.js";

import { aggregateArticleCounts, loadArticleFacets } from "./aggregate-repository.js";
import type { ArticleFilters } from "./article-filters.js";
import { listArticles } from "./list-repository.js";
import {
    renderCompiledTsQuery,
    searchArticles,
} from "./search-repository.js";

/**
 * Translate the validated query-string filter fields into repository filters.
 * Shared by the list, search, and aggregate endpoints so that every filter is
 * applied consistently no matter which endpoint received it.
 */
function buildArticleFilters(query: ArticleFilterQuery): ArticleFilters {
    const filters: ArticleFilters = {};

    if (query.source !== undefined) {
        filters.source = query.source;
    }

    if (query.language !== undefined) {
        filters.language = query.language;
    }

    if (query.sentiment !== undefined) {
        filters.sentiment = query.sentiment;
    }

    if (query.topic_tag !== undefined) {
        filters.topicTag = query.topic_tag;
    }

    if (query.date_from !== undefined) {
        filters.dateFrom = query.date_from;
    }

    if (query.date_to !== undefined) {
        filters.dateTo = query.date_to;
    }

    if (query.enriched === "true") {
        filters.enriched = true;
    }

    if (query.enriched === "false") {
        filters.enriched = false;
    }

    return filters;
}

/**
 * Validated keyset cursor fields as they arrive on the query string.
 */
interface CursorQueryFields {
    cursor_published_at?: string;
    cursor_id?: number;
}

/**
 * Rebuild a keyset cursor from its query-string halves. The schema guarantees
 * the two fields arrive together, so either both are set or there is no cursor.
 */
function buildCursor(query: CursorQueryFields): PaginationCursor | undefined {
    if (query.cursor_published_at === undefined || query.cursor_id === undefined) {
        return undefined;
    }

    const cursor: PaginationCursor = {
        published_at: query.cursor_published_at,
        id: query.cursor_id,
    };

    return cursor;
}

/**
 * Execute a paginated article list against PostgreSQL.
 */
export async function executeArticleList(
    pool: pg.Pool,
    query: ListArticlesQuery,
): Promise<PaginatedArticlesResponse> {
    const filters = buildArticleFilters(query);
    const cursor = buildCursor(query);

    const listResult = await listArticles(pool, {
        filters,
        cursor,
        limit: query.limit,
    });

    return listResult;
}

/**
 * Execute an article count aggregate against PostgreSQL.
 */
export async function executeArticleAggregate(
    pool: pg.Pool,
    query: AggregateArticlesQuery,
): Promise<ArticleCountsResponse> {
    const filters = buildArticleFilters(query);
    const aggregateResult = await aggregateArticleCounts(pool, {
        granularity: query.granularity,
        filters,
    });

    return aggregateResult;
}

/**
 * Load facet values for filter dropdowns.
 */
export async function executeArticleFacets(
    pool: pg.Pool,
): Promise<ArticleFacetsResponse> {
    const facets = await loadArticleFacets(pool);
    return facets;
}

/**
 * Execute a boolean article search against PostgreSQL.
 */
export async function executeArticleSearch(
    pool: pg.Pool,
    query: SearchArticlesQuery,
): Promise<PaginatedArticlesResponse> {
    const compiledQuery = compileBooleanQuery(query.q);
    const filters = buildArticleFilters(query);
    const cursor = buildCursor(query);

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
