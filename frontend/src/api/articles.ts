"use strict";

import type {
    ArticleCountsResponse,
    ArticleEnrichmentResponse,
    ArticleFacetsResponse,
    PaginatedArticlesResponse,
    PaginationCursor,
    Sentiment,
} from "@carma/shared";

import { fetchJson } from "./client.ts";

/**
 * Shared filter fields for article list and search requests.
 */
export interface ArticleQueryFilters {
    source?: string;
    language?: string;
    sentiment?: Sentiment;
    enriched?: "true" | "false";
    date_from?: string;
    date_to?: string;
}

/**
 * Parameters for listing articles.
 */
export interface ListArticlesParams extends ArticleQueryFilters {
    limit?: number;
    cursor?: PaginationCursor;
}

/**
 * Parameters for searching articles.
 */
export interface SearchArticlesParams extends ArticleQueryFilters {
    q: string;
    limit?: number;
    cursor?: PaginationCursor;
}

/**
 * Parameters for aggregate counts.
 */
export interface AggregateArticlesParams {
    granularity?: "month" | "week";
    source?: string;
    language?: string;
    sentiment?: Sentiment;
    topic_tag?: string;
    date_from?: string;
    date_to?: string;
}

/**
 * Parameters for enriching an article.
 */
export interface EnrichArticleParams {
    articleId: number;
    force?: boolean;
}

/**
 * Build query object from list/search params.
 */
function buildCursorQuery(cursor: PaginationCursor | undefined): Record<string, string | number | undefined> {
    if (cursor === undefined) {
        return {};
    }

    return {
        cursor_published_at: cursor.published_at,
        cursor_id: cursor.id,
    };
}

/**
 * List articles with optional filters and keyset pagination.
 */
export async function listArticles(
    params: ListArticlesParams = {},
): Promise<PaginatedArticlesResponse> {
    const cursorQuery = buildCursorQuery(params.cursor);
    const result = await fetchJson<PaginatedArticlesResponse>({
        path: "/api/articles",
        query: {
            limit: params.limit,
            source: params.source,
            language: params.language,
            sentiment: params.sentiment,
            enriched: params.enriched,
            date_from: params.date_from,
            date_to: params.date_to,
            ...cursorQuery,
        },
    });

    return result;
}

/**
 * Search articles with a boolean query.
 */
export async function searchArticles(
    params: SearchArticlesParams,
): Promise<PaginatedArticlesResponse> {
    const cursorQuery = buildCursorQuery(params.cursor);
    const result = await fetchJson<PaginatedArticlesResponse>({
        path: "/api/articles/search",
        query: {
            q: params.q,
            limit: params.limit,
            source: params.source,
            language: params.language,
            sentiment: params.sentiment,
            enriched: params.enriched,
            date_from: params.date_from,
            date_to: params.date_to,
            ...cursorQuery,
        },
    });

    return result;
}

/**
 * Fetch article counts grouped by month or week.
 */
export async function fetchAggregate(
    params: AggregateArticlesParams = {},
): Promise<ArticleCountsResponse> {
    const result = await fetchJson<ArticleCountsResponse>({
        path: "/api/articles/aggregate",
        query: {
            granularity: params.granularity,
            source: params.source,
            language: params.language,
            sentiment: params.sentiment,
            topic_tag: params.topic_tag,
            date_from: params.date_from,
            date_to: params.date_to,
        },
    });

    return result;
}

/**
 * Fetch distinct filter facet values.
 */
export async function fetchFacets(): Promise<ArticleFacetsResponse> {
    const result = await fetchJson<ArticleFacetsResponse>({
        path: "/api/articles/facets",
    });

    return result;
}

/**
 * Enrich a single article, optionally forcing overwrite.
 */
export async function enrichArticle(
    params: EnrichArticleParams,
): Promise<ArticleEnrichmentResponse> {
    const result = await fetchJson<ArticleEnrichmentResponse>({
        path: `/api/articles/${params.articleId}/enrich`,
        method: "POST",
        query: {
            force: params.force === true ? true : undefined,
        },
    });

    return result;
}

const UNENRICHED_PAGE_SIZE = 100;

/**
 * Collect all unenriched article ids using keyset pagination.
 */
export async function listUnenrichedArticleIds(): Promise<number[]> {
    const articleIds: number[] = [];
    let cursor: PaginationCursor | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
        const page = await listArticles({
            enriched: "false",
            limit: UNENRICHED_PAGE_SIZE,
            cursor,
        });

        for (const article of page.items) {
            articleIds.push(article.id);
        }

        if (page.has_more && page.next_cursor !== null) {
            cursor = page.next_cursor;
            hasMore = true;
        } else {
            hasMore = false;
        }
    }

    return articleIds;
}
