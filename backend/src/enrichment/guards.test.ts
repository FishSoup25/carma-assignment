"use strict";

import { describe, expect, it } from "vitest";

import { EnrichmentError } from "./errors.js";
import {
    assertArticleHasContent,
    clampArticleText,
    estimateTokenCount,
} from "./guards.js";

describe("clampArticleText", function clampArticleTextSuite(): void {
    it("returns text unchanged when within limits", function returnsUnchanged(): void {
        const result = clampArticleText({
            headline: "Short headline",
            body: "Short body",
            maxHeadlineChars: 512,
            maxBodyChars: 8000,
        });

        expect(result.headline).toBe("Short headline");
        expect(result.body).toBe("Short body");
        expect(result.headlineTruncated).toBe(false);
        expect(result.bodyTruncated).toBe(false);
    });

    it("truncates body on a word boundary and sets truncated flag", function truncatesBody(): void {
        const longBody = "word ".repeat(300).trim();
        const result = clampArticleText({
            headline: "Headline",
            body: longBody,
            maxHeadlineChars: 512,
            maxBodyChars: 100,
        });

        expect(result.body.length).toBeLessThanOrEqual(100);
        expect(result.bodyTruncated).toBe(true);
        expect(result.body.endsWith("word")).toBe(true);
    });

    it("throws article_empty when both fields are blank", function throwsWhenEmpty(): void {
        expect(function throwEmpty(): void {
            assertArticleHasContent({ headline: "   ", body: "" });
        }).toThrow(EnrichmentError);
    });
});

describe("estimateTokenCount", function estimateTokenCountSuite(): void {
    it("estimates tokens from character length", function estimatesTokens(): void {
        const estimate = estimateTokenCount("12345678901234567890");
        expect(estimate).toBe(5);
    });
});
