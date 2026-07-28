"use strict";

import { EnrichmentError } from "./errors.js";
import type { PreparedArticleText } from "./types.js";

/**
 * Parameters for clamping article text to LLM input size limits.
 */
export interface ClampArticleTextParams {
    headline: string;
    body: string;
    maxHeadlineChars: number;
    maxBodyChars: number;
}

/**
 * Truncate text on a word boundary when possible.
 */
function truncateOnWordBoundary(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    const sliceEnd = maxLength;
    const candidate = value.slice(0, sliceEnd);
    const lastSpaceIndex = candidate.lastIndexOf(" ");

    if (lastSpaceIndex > Math.floor(maxLength * 0.6)) {
        const truncated = candidate.slice(0, lastSpaceIndex).trim();
        return truncated;
    }

    const truncated = candidate.trim();
    return truncated;
}

/**
 * Clamp headline and body to configured character limits.
 */
export function clampArticleText(params: ClampArticleTextParams): PreparedArticleText {
    const headlineTruncated = params.headline.length > params.maxHeadlineChars;
    const bodyTruncated = params.body.length > params.maxBodyChars;

    const headline = truncateOnWordBoundary(params.headline, params.maxHeadlineChars);
    const body = truncateOnWordBoundary(params.body, params.maxBodyChars);

    const result: PreparedArticleText = {
        headline,
        body,
        headlineTruncated,
        bodyTruncated,
    };

    return result;
}

/**
 * Estimate token count from character length (rough heuristic).
 */
export function estimateTokenCount(text: string): number {
    const estimated = Math.ceil(text.length / 4);
    return estimated;
}

/**
 * Parameters for verifying an article has usable content after sanitization.
 */
export interface AssertArticleHasContentParams {
    headline: string;
    body: string;
}

/**
 * Throw when both headline and body are empty after sanitization.
 */
export function assertArticleHasContent(params: AssertArticleHasContentParams): void {
    const headlineEmpty = params.headline.trim().length === 0;
    const bodyEmpty = params.body.trim().length === 0;

    if (headlineEmpty && bodyEmpty) {
        throw new EnrichmentError(
            "article_empty",
            "Article has no usable headline or body content for enrichment",
        );
    }
}
