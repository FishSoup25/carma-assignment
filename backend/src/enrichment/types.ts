"use strict";

/**
 * Article fields required to build an enrichment prompt.
 */
export interface ArticleEnrichmentInput {
    id: number;
    headline: string | null;
    body: string | null;
    language: string;
}

/**
 * OpenRouter chat message shape.
 */
export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

/**
 * Sanitized and clamped article text ready for prompt rendering.
 */
export interface PreparedArticleText {
    headline: string;
    body: string;
    headlineTruncated: boolean;
    bodyTruncated: boolean;
}
