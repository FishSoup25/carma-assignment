"use strict";

import { describe, expect, it } from "vitest";

import { EnrichmentError } from "./errors.js";
import { assertArticleHasContent, clampArticleText } from "./guards.js";

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

    it("truncates the headline independently of the body", function truncatesHeadlineOnly(): void {
        const result = clampArticleText({
            headline: "a".repeat(50),
            body: "Short body",
            maxHeadlineChars: 20,
            maxBodyChars: 8000,
        });

        expect(result.headline.length).toBeLessThanOrEqual(20);
        expect(result.headlineTruncated).toBe(true);
        expect(result.bodyTruncated).toBe(false);
    });
});

describe("assertArticleHasContent", function assertArticleHasContentSuite(): void {
    it("throws article_empty when both fields are blank", function throwsWhenEmpty(): void {
        expect(function throwEmpty(): void {
            assertArticleHasContent({ headline: "   ", body: "" });
        }).toThrow(EnrichmentError);
    });

    it("accepts an article with only a headline", function acceptsHeadlineOnly(): void {
        expect(function passHeadlineOnly(): void {
            assertArticleHasContent({ headline: "Energy prices rise", body: "" });
        }).not.toThrow();
    });
});
