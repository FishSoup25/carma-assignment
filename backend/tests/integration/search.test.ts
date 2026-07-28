"use strict";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { articlesTableExists, countArticles } from "../../src/articles/search-repository.js";
import { closePool, getPool } from "../../src/db/pool.js";

const app = createApp();

/**
 * Extract article ids from a paginated search response.
 */
function extractArticleIds(body: { items: Array<{ id: number }> }): number[] {
    const ids: number[] = [];

    for (const item of body.items) {
        ids.push(item.id);
    }

    return ids;
}

describe("GET /api/articles/search", function searchEndpointSuite(): void {
    beforeAll(async function assertSeededDatabase(): Promise<void> {
        const pool = getPool();
        const articleCount = await countArticles(pool);

        if (articleCount !== 20) {
            throw new Error(
                "Expected 20 seeded articles. Run `npm run seed:articles` before integration tests.",
            );
        }
    });

    afterAll(async function closeDatabasePool(): Promise<void> {
        await closePool();
    });

    it("matches oil prices AND (geopolitical OR supply chain)", async function matchesFirstBriefQuery(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: '"oil prices" AND (geopolitical OR "supply chain")' });

        expect(response.status).toBe(200);
        expect(extractArticleIds(response.body)).toEqual([1]);
    });

    it("matches renewable AND NOT (nuclear OR coal)", async function matchesSecondBriefQuery(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: "renewable AND NOT (nuclear OR coal)" });

        expect(response.status).toBe(200);
        expect(extractArticleIds(response.body)).toEqual([5]);
    });

    it("excludes startup matches for the third brief query", async function matchesThirdBriefQuery(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: 'AI AND ("healthcare" OR "diagnostic") AND NOT startup*' });

        expect(response.status).toBe(200);
        expect(extractArticleIds(response.body)).toEqual([]);
    });

    it("returns article 10 without the NOT startup clause", async function matchesPositiveControl(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: 'AI AND ("healthcare" OR "diagnostic")' });

        expect(response.status).toBe(200);
        expect(extractArticleIds(response.body)).toEqual([10]);
    });

    it("matches Arabic content with a real lexeme", async function matchesArabicArticle(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: "أسعار" });

        expect(response.status).toBe(200);
        expect(extractArticleIds(response.body)).toEqual([8]);
    });

    it("matches Chinese content with prefix wildcard", async function matchesChinesePrefix(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: "中国*" });

        expect(response.status).toBe(200);
        expect(extractArticleIds(response.body)).toEqual([9]);
    });

    it("does not match partial Chinese tokens without wildcard", async function rejectsPartialChineseToken(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: "科技" });

        expect(response.status).toBe(200);
        expect(extractArticleIds(response.body)).toEqual([]);
    });

    it("applies language and date filters", async function appliesStructuredFilters(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({
                q: "أسعار",
                language: "ar",
                date_from: "2026-07-01T00:00:00Z",
                date_to: "2026-07-31T23:59:59Z",
            });

        expect(response.status).toBe(200);
        expect(extractArticleIds(response.body)).toEqual([8]);
    });

    it("supports keyset pagination", async function paginatesResults(): Promise<void> {
        const firstPage = await request(app)
            .get("/api/articles/search")
            .query({ q: "AI", limit: 1 });

        expect(firstPage.status).toBe(200);
        expect(firstPage.body.has_more).toBe(true);
        expect(firstPage.body.next_cursor).not.toBeNull();

        const secondPage = await request(app)
            .get("/api/articles/search")
            .query({
                q: "AI",
                limit: 1,
                cursor_published_at: firstPage.body.next_cursor.published_at,
                cursor_id: firstPage.body.next_cursor.id,
            });

        expect(secondPage.status).toBe(200);
        expect(secondPage.body.items[0].id).not.toBe(firstPage.body.items[0].id);
    });

    it("rejects hostile tsquery injection input", async function rejectsInjectionAttempt(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: "oil') OR 1=1 --" });

        expect([200, 400]).toContain(response.status);

        const pool = getPool();
        const tableExists = await articlesTableExists(pool);

        expect(tableExists).toBe(true);

        if (response.status === 200) {
            expect(extractArticleIds(response.body)).toEqual([]);
        }
    });

    it("survives SQL-looking input without damaging the database", async function survivesSqlLikeInput(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search")
            .query({ q: "'; DROP TABLE articles; --" });

        expect([200, 400]).toContain(response.status);

        const pool = getPool();
        const tableExists = await articlesTableExists(pool);

        expect(tableExists).toBe(true);
    });
});

describe("GET /api/articles/search/parse", function parseEndpointSuite(): void {
    afterAll(async function closeDatabasePool(): Promise<void> {
        await closePool();
    });

    it("returns AST and compiled tsquery text", async function returnsParseDebugPayload(): Promise<void> {
        const response = await request(app)
            .get("/api/articles/search/parse")
            .query({ q: '"oil prices" AND geopolitical' });

        expect(response.status).toBe(200);
        expect(response.body.ast.kind).toBe("and");
        expect(response.body.compiled_tsquery).toContain("oil");
    });
});
