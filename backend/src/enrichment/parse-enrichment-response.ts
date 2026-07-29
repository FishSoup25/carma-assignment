"use strict";

import { z } from "zod";

import { EnrichmentError } from "./errors.js";
import { assertEnglishOutput } from "./language-guard.js";
import {
    enrichmentResponseSchema,
    type EnrichmentResponsePayload,
} from "./response-schema.js";

/**
 * Marker message used to tell a JSON decode failure apart from a schema
 * violation, since both surface as validation issues but map to different
 * error codes and HTTP statuses.
 */
const JSON_DECODE_ISSUE = "llm_response_is_not_json";

/**
 * Decode raw model text as JSON, then validate it against the enrichment
 * schema. Zod owns both steps so the undecoded value is never held in a
 * variable and cannot be read before it has been validated.
 */
const enrichmentJsonSchema = z
    .string()
    .transform(function decodeJsonText(rawContent: string, context: z.RefinementCtx) {
        try {
            return JSON.parse(rawContent);
        } catch {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: JSON_DECODE_ISSUE,
            });

            return z.NEVER;
        }
    })
    .pipe(enrichmentResponseSchema);

/**
 * Parse and validate raw LLM JSON content against the enrichment schema.
 */
export function parseEnrichmentResponse(rawContent: string): EnrichmentResponsePayload {
    const validationResult = enrichmentJsonSchema.safeParse(rawContent);

    if (!validationResult.success) {
        const firstIssue = validationResult.error.issues[0];

        if (firstIssue?.message === JSON_DECODE_ISSUE) {
            throw new EnrichmentError(
                "llm_invalid_json",
                "LLM response is not valid JSON",
            );
        }

        throw new EnrichmentError(
            "llm_schema_violation",
            firstIssue?.message ?? "LLM response does not match the required schema",
        );
    }

    assertEnglishOutput({
        summary: validationResult.data.summary,
        topicTags: validationResult.data.topic_tags,
    });

    const payload = validationResult.data;
    return payload;
}
