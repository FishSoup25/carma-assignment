"use strict";

import { z } from "zod";

/**
 * Zod schema for validating LLM enrichment JSON output.
 */
export const enrichmentResponseSchema = z.object({
    summary: z.string().trim().min(20).max(320),
    sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
    topic_tags: z.array(z.string().trim().min(2).max(32)).min(1).max(3),
}).strict();

export type EnrichmentResponsePayload = z.infer<typeof enrichmentResponseSchema>;

/**
 * JSON Schema sent to OpenRouter for strict structured output.
 *
 * Duplicates the Zod constraints above because the provider needs the limits in
 * JSON Schema form to constrain generation, while Zod still validates the reply
 * in case the provider ignores the schema.
 */
const enrichmentResponseJsonSchema = {
    type: "object",
    additionalProperties: false,
    required: ["summary", "sentiment", "topic_tags"],
    properties: {
        summary: {
            type: "string",
            minLength: 20,
            maxLength: 320,
            description: "A concise 1-2 sentence summary in English.",
        },
        sentiment: {
            type: "string",
            enum: ["positive", "negative", "neutral", "mixed"],
            description: "Sentiment classification in English.",
        },
        topic_tags: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
                type: "string",
                minLength: 2,
                maxLength: 32,
                description: "Short topic label in English.",
            },
            description: "One to three topic tags, always in English.",
        },
    },
} as const;

/**
 * OpenRouter `response_format` payload requesting strict JSON schema output.
 */
export interface EnrichmentResponseFormat {
    type: "json_schema";
    json_schema: {
        name: string;
        strict: boolean;
        schema: typeof enrichmentResponseJsonSchema;
    };
}

/**
 * Build the response format that pins the model to the enrichment schema.
 */
export function buildEnrichmentResponseFormat(): EnrichmentResponseFormat {
    const responseFormat: EnrichmentResponseFormat = {
        type: "json_schema" as const,
        json_schema: {
            name: "article_enrichment",
            strict: true,
            schema: enrichmentResponseJsonSchema,
        },
    };

    return responseFormat;
}
