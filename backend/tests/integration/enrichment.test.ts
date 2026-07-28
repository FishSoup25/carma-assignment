"use strict";

import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { countArticles } from "../../src/articles/search-repository.js";
import { closePool, getPool } from "../../src/db/pool.js";
import { resetEnrichmentConfigCache } from "../../src/enrichment/config.js";

import { ensureEnrichmentColumns } from "./test-db-setup.js";

const VALID_ENRICHMENT_CONTENT = JSON.stringify({
    summary: "Oil prices rose sharply this week amid supply concerns in the region.",
    sentiment: "negative",
    topic_tags: ["Energy", "Geopolitics"],
});

const ARABIC_ENRICHMENT_CONTENT = JSON.stringify({
    summary: "ارتفاع أسعار النفط amid supply concerns in the region today.",
    sentiment: "negative",
    topic_tags: ["Energy"],
});

const { mockRequestEnrichmentCompletion } = vi.hoisted(function createMocks(): {
    mockRequestEnrichmentCompletion: ReturnType<typeof vi.fn>;
    } {
    const mockFn = vi.fn();
    const mocks = {
        mockRequestEnrichmentCompletion: mockFn,
    };

    return mocks;
});

vi.mock("../../src/enrichment/openrouter-client.js", function mockOpenRouterClient(): {
    requestEnrichmentCompletion: ReturnType<typeof vi.fn>;
    } {
    return {
        requestEnrichmentCompletion: mockRequestEnrichmentCompletion,
    };
});

const app = createApp();

/**
 * Clear enrichment data for a single article id.
 */
async function clearArticleEnrichment(articleId: number): Promise<void> {
    const pool = getPool();
    const clearSql = `
    UPDATE articles
    SET
      model_handle = NULL,
      summary = NULL,
      sentiment = NULL,
      topic_tags = NULL,
      enriched_at = NULL,
      prompt_tokens = NULL,
      completion_tokens = NULL,
      cost_usd = NULL
    WHERE id = $1
  `;

    await pool.query(clearSql, [articleId]);
}

describe("POST /api/articles/:id/enrich", function enrichEndpointSuite(): void {
    beforeAll(async function assertSeededDatabase(): Promise<void> {
        process.env.OPENROUTER_API_KEY = "test-key";
        resetEnrichmentConfigCache();

        const pool = getPool();
        await ensureEnrichmentColumns(pool);

        const articleCount = await countArticles(pool);

        if (articleCount !== 20) {
            throw new Error(
                "Expected 20 seeded articles. Run `npm run seed:articles` before integration tests.",
            );
        }
    });

    beforeEach(async function resetMocksAndArticle(): Promise<void> {
        mockRequestEnrichmentCompletion.mockReset();
        resetEnrichmentConfigCache();
        process.env.OPENROUTER_API_KEY = "test-key";
        await clearArticleEnrichment(3);
    });

    afterAll(async function closeDatabasePool(): Promise<void> {
        await closePool();
    });

    it("returns 404 for an unknown article id", async function returns404(): Promise<void> {
        const response = await request(app)
            .post("/api/articles/999/enrich");

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("article_not_found");
    });

    it("returns 400 for a non-numeric article id", async function returns400(): Promise<void> {
        const response = await request(app)
            .post("/api/articles/not-a-number/enrich");

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("validation_error");
    });

    it("enriches an article and persists the result", async function enrichesArticle(): Promise<void> {
        mockRequestEnrichmentCompletion.mockResolvedValue({
            content: VALID_ENRICHMENT_CONTENT,
            promptTokens: 150,
            completionTokens: 45,
            reportedCostUsd: 0.00006,
        });

        const response = await request(app)
            .post("/api/articles/3/enrich");

        expect(response.status).toBe(200);
        expect(response.body.cached).toBe(false);
        expect(response.body.enrichment.summary).toContain("Oil prices");
        expect(response.body.enrichment.sentiment).toBe("negative");
        expect(response.body.enrichment.topic_tags).toEqual(["Energy", "Geopolitics"]);
        expect(response.body.usage.prompt_tokens).toBe(150);
        expect(response.body.usage.completion_tokens).toBe(45);
        expect(response.body.article.enriched_at).not.toBeNull();
    });

    it("returns cached enrichment without calling the LLM again", async function returnsCachedEnrichment(): Promise<void> {
        mockRequestEnrichmentCompletion.mockResolvedValue({
            content: VALID_ENRICHMENT_CONTENT,
            promptTokens: 150,
            completionTokens: 45,
            reportedCostUsd: 0.00006,
        });

        const firstResponse = await request(app)
            .post("/api/articles/3/enrich");

        expect(firstResponse.status).toBe(200);

        const secondResponse = await request(app)
            .post("/api/articles/3/enrich");

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.cached).toBe(true);
        expect(mockRequestEnrichmentCompletion).toHaveBeenCalledTimes(1);
    });

    it("returns 502 when the mocked model returns invalid JSON", async function returns502ForInvalidJson(): Promise<void> {
        mockRequestEnrichmentCompletion.mockResolvedValue({
            content: "This is not JSON",
            promptTokens: 10,
            completionTokens: 5,
            reportedCostUsd: null,
        });

        const response = await request(app)
            .post("/api/articles/3/enrich");

        expect(response.status).toBe(502);
        expect(response.body.error).toBe("llm_invalid_json");
    });

    it("returns 502 when the mocked model returns non-English output for the Arabic article", async function returns502ForArabicOutput(): Promise<void> {
        await clearArticleEnrichment(8);

        mockRequestEnrichmentCompletion.mockResolvedValue({
            content: ARABIC_ENRICHMENT_CONTENT,
            promptTokens: 10,
            completionTokens: 5,
            reportedCostUsd: null,
        });

        const response = await request(app)
            .post("/api/articles/8/enrich");

        expect(response.status).toBe(502);
        expect(response.body.error).toBe("llm_non_english_output");
    });
});
