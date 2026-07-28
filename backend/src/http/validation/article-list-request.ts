"use strict";

import { z } from "zod";

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

const sentimentValues = ["positive", "negative", "neutral", "mixed"] as const;

/**
 * Shared cursor pairing refinement used by list and search schemas.
 */
function refineCursorPairing(
    values: {
        cursor_published_at?: string;
        cursor_id?: number;
    },
    context: z.RefinementCtx,
): void {
    const hasPublishedAt = values.cursor_published_at !== undefined;
    const hasCursorId = values.cursor_id !== undefined;

    if (hasPublishedAt !== hasCursorId) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "cursor_published_at and cursor_id must be provided together",
            path: ["cursor_published_at"],
        });
    }
}

/**
 * Zod schema for paginated article list query parameters.
 */
export const listArticlesQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).default(DEFAULT_LIST_LIMIT),
    cursor_published_at: z.string().datetime({ offset: true }).optional(),
    cursor_id: z.coerce.number().int().positive().optional(),
    source: z.string().min(1).max(128).optional(),
    language: z.string().min(2).max(8).optional(),
    sentiment: z.enum(sentimentValues).optional(),
    enriched: z.enum(["true", "false"]).optional(),
    date_from: z.string().datetime({ offset: true }).optional(),
    date_to: z.string().datetime({ offset: true }).optional(),
}).superRefine(refineCursorPairing);

/**
 * Parsed and validated article list query parameters.
 */
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;

/**
 * Zod schema for article aggregate query parameters.
 */
export const aggregateArticlesQuerySchema = z.object({
    granularity: z.enum(["month", "week"]).default("month"),
    source: z.string().min(1).max(128).optional(),
    language: z.string().min(2).max(8).optional(),
    sentiment: z.enum(sentimentValues).optional(),
    topic_tag: z.string().min(1).max(64).optional(),
    date_from: z.string().datetime({ offset: true }).optional(),
    date_to: z.string().datetime({ offset: true }).optional(),
});

/**
 * Parsed and validated article aggregate query parameters.
 */
export type AggregateArticlesQuery = z.infer<typeof aggregateArticlesQuerySchema>;
