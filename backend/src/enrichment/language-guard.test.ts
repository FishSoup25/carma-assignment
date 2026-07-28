"use strict";

import { describe, expect, it } from "vitest";

import { EnrichmentError } from "./errors.js";
import { assertEnglishOutput } from "./language-guard.js";

describe("assertEnglishOutput", function assertEnglishOutputSuite(): void {
    it("accepts English summaries and tags with accented Latin proper nouns", function acceptsEnglish(): void {
        expect(function passEnglish(): void {
            assertEnglishOutput({
                summary: "René discussed São Paulo energy markets in detail today.",
                topicTags: ["Energy", "Markets"],
            });
        }).not.toThrow();
    });

    it("rejects Arabic summaries", function rejectsArabicSummary(): void {
        expect(function throwArabic(): void {
            assertEnglishOutput({
                summary: "ارتفاع أسعار النفط amid supply concerns in the region today.",
                topicTags: ["Energy"],
            });
        }).toThrow(EnrichmentError);
    });

    it("rejects Chinese topic tags", function rejectsChineseTags(): void {
        expect(function throwChineseTag(): void {
            assertEnglishOutput({
                summary: "Oil prices rose sharply this week amid supply concerns.",
                topicTags: ["能源"],
            });
        }).toThrow(EnrichmentError);
    });

    it("rejects Cyrillic summaries", function rejectsCyrillicSummary(): void {
        expect(function throwCyrillic(): void {
            assertEnglishOutput({
                summary: "Нефтяные рынки показали рост на этой неделе из-за опасений.",
                topicTags: ["Energy"],
            });
        }).toThrow(EnrichmentError);
    });
});
