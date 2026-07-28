"use strict";

import { EnrichmentError } from "./errors.js";
import { assertEnglishOutput } from "./language-guard.js";
import {
    enrichmentResponseSchema,
    type EnrichmentResponsePayload,
} from "./response-schema.js";

/**
 * Parse and validate raw LLM JSON content against the enrichment schema.
 */
export function parseEnrichmentResponse(rawContent: string): EnrichmentResponsePayload {
    let parsedValue: Record<string, unknown>;

    try {
        parsedValue = JSON.parse(rawContent) as Record<string, unknown>;
    } catch {
        throw new EnrichmentError(
            "llm_invalid_json",
            "LLM response is not valid JSON",
        );
    }

    const validationResult = enrichmentResponseSchema.safeParse(parsedValue);

    if (!validationResult.success) {
        const firstIssue = validationResult.error.issues[0];
        const issueMessage = firstIssue?.message ?? "LLM response does not match the required schema";

        throw new EnrichmentError(
            "llm_schema_violation",
            issueMessage,
        );
    }

    assertEnglishOutput({
        summary: validationResult.data.summary,
        topicTags: validationResult.data.topic_tags,
    });

    const payload = validationResult.data;
    return payload;
}
