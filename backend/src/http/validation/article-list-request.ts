"use strict";

import type { Sentiment } from "@carma/shared";
import { z } from "zod";

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

const sentimentValues = ["positive", "negative", "neutral", "mixed"] as const;
const enrichedValues = ["true", "false"] as const;

/**
 * Filter fields accepted by the list, search, and aggregate endpoints.
 * Declared once and spread into every schema so the endpoints cannot drift
 * apart and silently ignore a filter the caller sent.
 */
export const articleFilterShape = {
    source: z.string().min(1).max(128).optional(),
    language: z.string().min(2).max(8).optional(),
    sentiment: z.enum(sentimentValues).optional(),
    topic_tag: z.string().min(1).max(64).optional(),
    enriched: z.enum(enrichedValues).optional(),
    date_from: z.string().datetime({ offset: true }).optional(),
    date_to: z.string().datetime({ offset: true }).optional(),
};

/**
 * Validated filter fields common to every article query endpoint.
 */
export interface ArticleFilterQuery {
    source?: string;
    language?: string;
    sentiment?: Sentiment;
    topic_tag?: string;
    enriched?: "true" | "false";
    date_from?: string;
    date_to?: string;
}

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
    ...articleFilterShape,
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
    ...articleFilterShape,
});

/**
 * Parsed and validated article aggregate query parameters.
 */
export type AggregateArticlesQuery = z.infer<typeof aggregateArticlesQuerySchema>;
