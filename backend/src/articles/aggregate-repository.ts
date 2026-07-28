"use strict";

import type {
    ArticleCountBucket,
    ArticleCountsResponse,
    ArticleFacetsResponse,
} from "@carma/shared";
import type pg from "pg";

import {
    buildFilterClauses,
    type ArticleFilters,
} from "./article-filters.js";

/**
 * Parameters for aggregating article counts by time period.
 */
export interface AggregateArticlesParams {
    granularity: "month" | "week";
    filters: ArticleFilters;
}

interface AggregateDatabaseRow {
    period_start: Date;
    count: string;
}

/**
 * Aggregate article counts grouped by month or week.
 */
export async function aggregateArticleCounts(
    pool: pg.Pool,
    params: AggregateArticlesParams,
): Promise<ArticleCountsResponse> {
    const filterResult = buildFilterClauses({
        filters: params.filters,
        startParamIndex: 2,
    });

    const queryParams: Array<string | number | Date | boolean> = [params.granularity];

    for (const filterParam of filterResult.queryParams) {
        queryParams.push(filterParam);
    }

    let whereSql = "";

    if (filterResult.whereClauses.length > 0) {
        whereSql = `WHERE ${filterResult.whereClauses.join(" AND ")}`;
    }

    const aggregateSql = `
    SELECT date_trunc($1, published_at) AS period_start, COUNT(*)::text AS count
    FROM articles
    ${whereSql}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

    const queryResult = await pool.query<AggregateDatabaseRow>(aggregateSql, queryParams);
    const buckets: ArticleCountBucket[] = [];

    for (const row of queryResult.rows) {
        buckets.push({
            period_start: row.period_start.toISOString(),
            count: Number(row.count),
        });
    }

    const response: ArticleCountsResponse = {
        buckets,
        granularity: params.granularity,
    };

    return response;
}

/**
 * Load distinct source, language, and topic tag values for filter dropdowns.
 */
export async function loadArticleFacets(pool: pg.Pool): Promise<ArticleFacetsResponse> {
    const sourcesPromise = pool.query<{ source: string }>(
        "SELECT DISTINCT source FROM articles ORDER BY 1 ASC",
    );
    const languagesPromise = pool.query<{ language: string }>(
        "SELECT DISTINCT language FROM articles ORDER BY 1 ASC",
    );
    const topicTagsPromise = pool.query<{ topic_tag: string }>(
        `
      SELECT DISTINCT unnest(topic_tags) AS topic_tag
      FROM articles
      WHERE topic_tags IS NOT NULL
      ORDER BY 1 ASC
    `,
    );

    const [sourcesResult, languagesResult, topicTagsResult] = await Promise.all([
        sourcesPromise,
        languagesPromise,
        topicTagsPromise,
    ]);

    const sources: string[] = [];

    for (const row of sourcesResult.rows) {
        sources.push(row.source);
    }

    const languages: string[] = [];

    for (const row of languagesResult.rows) {
        languages.push(row.language);
    }

    const topicTags: string[] = [];

    for (const row of topicTagsResult.rows) {
        topicTags.push(row.topic_tag);
    }

    const response: ArticleFacetsResponse = {
        sources,
        languages,
        topic_tags: topicTags,
    };

    return response;
}
