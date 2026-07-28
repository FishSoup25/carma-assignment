"use strict";

import { afterEach, describe, expect, it, vi } from "vitest";

import { resetEnrichmentConfigCache } from "./config.js";
import { EnrichmentError } from "./errors.js";
import { requestEnrichmentCompletion } from "./openrouter-client.js";

const VALID_CONTENT = JSON.stringify({
    summary: "Oil prices rose sharply this week amid supply concerns in the region.",
    sentiment: "negative",
    topic_tags: ["Energy", "Geopolitics"],
});

function buildSuccessResponse(): Response {
    const body = {
        choices: [{ message: { content: VALID_CONTENT } }],
        usage: {
            prompt_tokens: 120,
            completion_tokens: 40,
            cost: 0.00005,
        },
    };

    const response = new Response(JSON.stringify(body), { status: 200 });
    return response;
}

describe("requestEnrichmentCompletion", function requestEnrichmentCompletionSuite(): void {
    afterEach(function resetMocks(): void {
        vi.unstubAllGlobals();
        resetEnrichmentConfigCache();
        delete process.env.OPENROUTER_API_KEY;
    });

    it("retries on 429 and succeeds", async function retriesOn429(): Promise<void> {
        process.env.OPENROUTER_API_KEY = "test-key";

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
            .mockResolvedValueOnce(buildSuccessResponse());

        vi.stubGlobal("fetch", fetchMock);

        const result = await requestEnrichmentCompletion({
            messages: [{ role: "user", content: "test" }],
        });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.promptTokens).toBe(120);
        expect(result.completionTokens).toBe(40);
    });

    it("throws llm_rate_limited after retry exhaustion", async function throwsRateLimited(): Promise<void> {
        process.env.OPENROUTER_API_KEY = "test-key";

        const fetchMock = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(requestEnrichmentCompletion({
            messages: [{ role: "user", content: "test" }],
        })).rejects.toMatchObject({ code: "llm_rate_limited" });
    });

    it("throws llm_request_failed on non-retryable 400", async function throwsOn400(): Promise<void> {
        process.env.OPENROUTER_API_KEY = "test-key";

        const fetchMock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(requestEnrichmentCompletion({
            messages: [{ role: "user", content: "test" }],
        })).rejects.toMatchObject({ code: "llm_request_failed" });
    });

    it("throws llm_timeout when the request is aborted", async function throwsOnTimeout(): Promise<void> {
        process.env.OPENROUTER_API_KEY = "test-key";
        process.env.OPENROUTER_TIMEOUT_MS = "10";

        const fetchMock = vi.fn().mockImplementation(function abortFetch(): Promise<Response> {
            const abortError = new Error("Aborted");
            abortError.name = "AbortError";
            return Promise.reject(abortError);
        });

        vi.stubGlobal("fetch", fetchMock);

        await expect(requestEnrichmentCompletion({
            messages: [{ role: "user", content: "test" }],
        })).rejects.toMatchObject({ code: "llm_timeout" });
    });

    it("throws llm_request_failed for malformed response envelopes", async function throwsMalformedEnvelope(): Promise<void> {
        process.env.OPENROUTER_API_KEY = "test-key";

        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), {
            status: 200,
        }));

        vi.stubGlobal("fetch", fetchMock);

        await expect(requestEnrichmentCompletion({
            messages: [{ role: "user", content: "test" }],
        })).rejects.toMatchObject({ code: "llm_request_failed" });
    });

    it("throws llm_schema_violation when content is invalid JSON", async function throwsInvalidJson(): Promise<void> {
        process.env.OPENROUTER_API_KEY = "test-key";

        const body = {
            choices: [{ message: { content: "not json" } }],
            usage: { prompt_tokens: 1, completion_tokens: 1 },
        };

        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(requestEnrichmentCompletion({
            messages: [{ role: "user", content: "test" }],
        })).rejects.toMatchObject({ code: "llm_invalid_json" });
    });

    it("throws llm_not_configured when API key is missing", async function throwsNotConfigured(): Promise<void> {
        await expect(requestEnrichmentCompletion({
            messages: [{ role: "user", content: "test" }],
        })).rejects.toBeInstanceOf(EnrichmentError);
    });
});
