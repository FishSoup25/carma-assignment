"use strict";

import { describe, expect, it } from "vitest";

import { EnrichmentError } from "./errors.js";
import { parseEnrichmentResponse } from "./parse-enrichment-response.js";

const VALID_PAYLOAD = {
    summary: "Oil prices rose sharply this week amid supply concerns in the region.",
    sentiment: "negative" as const,
    topic_tags: ["Energy", "Geopolitics"],
};

/**
 * Capture the enrichment error code raised for raw model output. The code, not
 * just the fact that something threw, is what the API returns to the client.
 */
function parseErrorCode(rawContent: string): string {
    try {
        parseEnrichmentResponse(rawContent);
    } catch (error) {
        if (error instanceof EnrichmentError) {
            return error.code;
        }

        return "unexpected_error_type";
    }

    return "no_error_thrown";
}

describe("parseEnrichmentResponse", function parseEnrichmentResponseSuite(): void {
    it("parses valid JSON content", function parsesValidJson(): void {
        const parsed = parseEnrichmentResponse(JSON.stringify(VALID_PAYLOAD));

        expect(parsed.summary).toBe(VALID_PAYLOAD.summary);
        expect(parsed.sentiment).toBe("negative");
        expect(parsed.topic_tags).toEqual(["Energy", "Geopolitics"]);
    });

    it("reports prose responses as invalid JSON", function rejectsProse(): void {
        expect(parseErrorCode("This is not JSON at all.")).toBe("llm_invalid_json");
    });

    it("reports markdown-fenced JSON as invalid JSON", function rejectsMarkdownFence(): void {
        const fenced = `\`\`\`json\n${JSON.stringify(VALID_PAYLOAD)}\n\`\`\``;

        expect(parseErrorCode(fenced)).toBe("llm_invalid_json");
    });

    it("rejects payloads carrying extra keys", function rejectsExtraKeys(): void {
        const rawContent = JSON.stringify({
            ...VALID_PAYLOAD,
            extra: "field",
        });

        expect(parseErrorCode(rawContent)).toBe("llm_schema_violation");
    });

    it("rejects out-of-domain sentiment values", function rejectsUnknownSentiment(): void {
        const rawContent = JSON.stringify({
            ...VALID_PAYLOAD,
            sentiment: "optimistic",
        });

        expect(parseErrorCode(rawContent)).toBe("llm_schema_violation");
    });

    it("rejects zero topic tags", function rejectsZeroTags(): void {
        const rawContent = JSON.stringify({
            ...VALID_PAYLOAD,
            topic_tags: [],
        });

        expect(parseErrorCode(rawContent)).toBe("llm_schema_violation");
    });

    it("rejects four topic tags", function rejectsFourTags(): void {
        const rawContent = JSON.stringify({
            ...VALID_PAYLOAD,
            topic_tags: ["One", "Two", "Three", "Four"],
        });

        expect(parseErrorCode(rawContent)).toBe("llm_schema_violation");
    });

    it("rejects non-English summaries", function rejectsNonEnglishSummary(): void {
        const rawContent = JSON.stringify({
            ...VALID_PAYLOAD,
            summary: "ارتفاع أسعار النفط amid supply concerns in the region today.",
        });

        expect(parseErrorCode(rawContent)).toBe("llm_non_english_output");
    });
});
