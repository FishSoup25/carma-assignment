"use strict";

import { describe, expect, it } from "vitest";

import {
    buildEnrichmentMessages,
    ENRICHMENT_SYSTEM_PROMPT,
    getStaticMessagePrefix,
} from "./prompt.js";

describe("buildEnrichmentMessages", function buildEnrichmentMessagesSuite(): void {
    it("keeps a byte-identical static prefix for different articles", function keepsStaticPrefix(): void {
        const firstMessages = buildEnrichmentMessages({
            article: { id: 1, headline: "One", body: "Body one", language: "en" },
            headline: "One",
            body: "Body one",
        });
        const secondMessages = buildEnrichmentMessages({
            article: { id: 2, headline: "Two", body: "Body two", language: "fr" },
            headline: "Two",
            body: "Body two",
        });

        const firstPrefix = JSON.stringify(firstMessages.slice(0, 3));
        const secondPrefix = JSON.stringify(secondMessages.slice(0, 3));
        const staticPrefix = JSON.stringify(getStaticMessagePrefix());

        expect(firstPrefix).toBe(secondPrefix);
        expect(firstPrefix).toBe(staticPrefix);
    });

    it("places article content only in the final user message", function articleOnlyInFinalMessage(): void {
        const messages = buildEnrichmentMessages({
            article: { id: 3, headline: "Secret", body: "Hidden body", language: "en" },
            headline: "Secret",
            body: "Hidden body",
        });

        expect(messages).toHaveLength(4);
        expect(messages[3]?.role).toBe("user");
        expect(messages[3]?.content).toContain("Secret");
        expect(messages[0]?.content).not.toContain("Secret");
        expect(messages[1]?.content).not.toContain("Secret");
        expect(messages[2]?.content).not.toContain("Secret");
    });

    it("includes untrusted-data and English-only instructions in the system prompt", function includesInstructions(): void {
        expect(ENRICHMENT_SYSTEM_PROMPT).toContain("UNTRUSTED DATA");
        expect(ENRICHMENT_SYSTEM_PROMPT).toContain("ALWAYS be written in English");
    });
});
