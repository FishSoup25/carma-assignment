"use strict";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Sentiment } from "@carma/shared";

import { createApp } from "../../src/app.js";
import { countArticles } from "../../src/articles/search-repository.js";
import { closePool, getPool } from "../../src/db/pool.js";

import { ensureEnrichmentColumns } from "./test-db-setup.js";

/**
 * A term common enough to match most seeded English articles, so the
 * partition assertions below operate on a meaningful result set.
 */
const BROAD_QUERY = "the";
const ALL_ROWS_LIMIT = 100;
const SEEDED_ARTICLE_COUNT = 20;
const SENTIMENTS: readonly Sentiment[] = ["positive", "negative", "neutral", "mixed"];

const app = createApp();

type QueryParams = Record<string, string | number>;

interface ArticleSummaryRow {
    id: number;
    sentiment: Sentiment | null;
    enriched_at: string | null;
}

/**
 * Run a search request and return the matched articles.
 */
async function searchArticleRows(query: QueryParams): Promise<ArticleSummaryRow[]> {
    const response = await request(app).get("/api/articles/search").query(query);

    expect(response.status).toBe(200);

    const rows: ArticleSummaryRow[] = response.body.items;
    return rows;
}

/**
 * Run a list request and return the matched articles.
 */
async function listArticleRows(query: QueryParams): Promise<ArticleSummaryRow[]> {
    const response = await request(app).get("/api/articles").query(query);

    expect(response.status).toBe(200);

    const rows: ArticleSummaryRow[] = response.body.items;
    return rows;
}

/**
 * Run an aggregate request and total its bucket counts.
 */
async function aggregateTotalCount(query: QueryParams): Promise<number> {
    const response = await request(app).get("/api/articles/aggregate").query(query);

    expect(response.status).toBe(200);

    let total = 0;

    for (const bucket of response.body.buckets) {
        total = total + bucket.count;
    }

    return total;
}

/**
 * Collect article ids in ascending order for set comparisons.
 */
function toSortedIds(rows: ArticleSummaryRow[]): number[] {
    const ids: number[] = [];

    for (const row of rows) {
        ids.push(row.id);
    }

    ids.sort(function compareIds(left: number, right: number): number {
        return left - right;
    });

    return ids;
}

describe("article filter parity", function filterParitySuite(): void {
    beforeAll(async function assertSeededDatabase(): Promise<void> {
        const pool = getPool();
        await ensureEnrichmentColumns(pool);
        const articleCount = await countArticles(pool);

        if (articleCount !== SEEDED_ARTICLE_COUNT) {
            throw new Error(
                "Expected 20 seeded articles. Run `npm run seed:articles` before integration tests.",
            );
        }
    });

    afterAll(async function closeDatabasePool(): Promise<void> {
        await closePool();
    });

    it("applies the enriched filter on the aggregate endpoint", async function aggregateHonoursEnriched(): Promise<void> {
        const totalCount = await aggregateTotalCount({});
        const enrichedCount = await aggregateTotalCount({ enriched: "true" });
        const unenrichedCount = await aggregateTotalCount({ enriched: "false" });

        // An ignored filter would make both partitions return every article.
        expect(enrichedCount + unenrichedCount).toBe(totalCount);
    });

    it("agrees with the list endpoint on the enriched filter", async function aggregateMatchesList(): Promise<void> {
        const aggregateEnriched = await aggregateTotalCount({ enriched: "true" });
        const listEnriched = await listArticleRows({
            enriched: "true",
            limit: ALL_ROWS_LIMIT,
        });

        expect(aggregateEnriched).toBe(listEnriched.length);
    });

    it("applies the enriched filter on the search endpoint", async function searchHonoursEnriched(): Promise<void> {
        const allRows = await searchArticleRows({ q: BROAD_QUERY, limit: ALL_ROWS_LIMIT });
        const enrichedRows = await searchArticleRows({
            q: BROAD_QUERY,
            enriched: "true",
            limit: ALL_ROWS_LIMIT,
        });
        const unenrichedRows = await searchArticleRows({
            q: BROAD_QUERY,
            enriched: "false",
            limit: ALL_ROWS_LIMIT,
        });

        expect(enrichedRows.length + unenrichedRows.length).toBe(allRows.length);

        for (const row of enrichedRows) {
            expect(row.enriched_at).not.toBeNull();
        }

        for (const row of unenrichedRows) {
            expect(row.enriched_at).toBeNull();
        }
    });

    it("applies the sentiment filter on the search endpoint", async function searchHonoursSentiment(): Promise<void> {
        const enrichedRows = await searchArticleRows({
            q: BROAD_QUERY,
            enriched: "true",
            limit: ALL_ROWS_LIMIT,
        });

        const matchedIds: number[] = [];

        for (const sentiment of SENTIMENTS) {
            const rows = await searchArticleRows({
                q: BROAD_QUERY,
                sentiment,
                limit: ALL_ROWS_LIMIT,
            });

            for (const row of rows) {
                expect(row.sentiment).toBe(sentiment);
                matchedIds.push(row.id);
            }
        }

        matchedIds.sort(function compareIds(left: number, right: number): number {
            return left - right;
        });

        // Every enriched article carries exactly one sentiment, so the four
        // filtered result sets must partition the enriched result set.
        expect(matchedIds).toEqual(toSortedIds(enrichedRows));
    });

    it("applies the sentiment filter on the aggregate endpoint", async function aggregateHonoursSentiment(): Promise<void> {
        const enrichedCount = await aggregateTotalCount({ enriched: "true" });
        let sentimentTotal = 0;

        for (const sentiment of SENTIMENTS) {
            const bucketTotal = await aggregateTotalCount({ sentiment });
            sentimentTotal = sentimentTotal + bucketTotal;
        }

        expect(sentimentTotal).toBe(enrichedCount);
    });

    it("rejects a whitespace-only search query", async function rejectsBlankQuery(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: "   " });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("validation_error");
    });
});
