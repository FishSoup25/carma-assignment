"use strict";

import type { Sentiment } from "@carma/shared";

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
 * LLM-produced enrichment fields persisted on an article.
 */
export interface EnrichmentFields {
    summary: string;
    sentiment: Sentiment;
    topic_tags: string[];
}

/**
 * Token and cost usage reported by an enrichment request.
 */
export interface LlmUsage {
    prompt_tokens: number;
    completion_tokens: number;
    cost_usd: number;
}

/**
 * Result of a successful enrichment run.
 */
export interface EnrichmentOutcome {
    fields: EnrichmentFields;
    model_handle: string;
    usage: LlmUsage;
    truncated: boolean;
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
