"use strict";

import { describe, expect, it } from "vitest";

import { EnrichmentError } from "./errors.js";
import { parseEnrichmentResponse } from "./parse-enrichment-response.js";
import { enrichmentResponseSchema } from "./response-schema.js";

const VALID_PAYLOAD = {
    summary: "Oil prices rose sharply this week amid supply concerns in the region.",
    sentiment: "negative" as const,
    topic_tags: ["Energy", "Geopolitics"],
};

describe("enrichmentResponseSchema", function enrichmentResponseSchemaSuite(): void {
    it("accepts a valid enrichment payload", function acceptsValidPayload(): void {
        const parsed = enrichmentResponseSchema.parse(VALID_PAYLOAD);
        expect(parsed.summary).toBe(VALID_PAYLOAD.summary);
    });

    it("rejects extra keys", function rejectsExtraKeys(): void {
        const result = enrichmentResponseSchema.safeParse({
            ...VALID_PAYLOAD,
            extra: "field",
        });

        expect(result.success).toBe(false);
    });
});

describe("parseEnrichmentResponse", function parseEnrichmentResponseSuite(): void {
    it("parses valid JSON content", function parsesValidJson(): void {
        const parsed = parseEnrichmentResponse(JSON.stringify(VALID_PAYLOAD));
        expect(parsed.topic_tags).toEqual(["Energy", "Geopolitics"]);
    });

    it("rejects prose responses", function rejectsProse(): void {
        expect(function throwProse(): void {
            parseEnrichmentResponse("This is not JSON at all.");
        }).toThrow(EnrichmentError);
    });

    it("rejects markdown-fenced JSON", function rejectsMarkdownFence(): void {
        expect(function throwFence(): void {
            parseEnrichmentResponse("```json\n" + JSON.stringify(VALID_PAYLOAD) + "\n```");
        }).toThrow(EnrichmentError);
    });

    it("rejects unknown sentiment values", function rejectsUnknownSentiment(): void {
        expect(function throwSentiment(): void {
            parseEnrichmentResponse(JSON.stringify({
                ...VALID_PAYLOAD,
                sentiment: "optimistic",
            }));
        }).toThrow(EnrichmentError);
    });

    it("rejects zero topic tags", function rejectsZeroTags(): void {
        expect(function throwZeroTags(): void {
            parseEnrichmentResponse(JSON.stringify({
                ...VALID_PAYLOAD,
                topic_tags: [],
            }));
        }).toThrow(EnrichmentError);
    });

    it("rejects four topic tags", function rejectsFourTags(): void {
        expect(function throwFourTags(): void {
            parseEnrichmentResponse(JSON.stringify({
                ...VALID_PAYLOAD,
                topic_tags: ["One", "Two", "Three", "Four"],
            }));
        }).toThrow(EnrichmentError);
    });

    it("rejects non-English summaries", function rejectsNonEnglishSummary(): void {
        expect(function throwNonEnglish(): void {
            parseEnrichmentResponse(JSON.stringify({
                ...VALID_PAYLOAD,
                summary: "ارتفاع أسعار النفط amid supply concerns in the region today.",
            }));
        }).toThrow(EnrichmentError);
    });
});
