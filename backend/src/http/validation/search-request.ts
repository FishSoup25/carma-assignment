"use strict";

import { z } from "zod";

import { articleFilterShape } from "./article-list-request.js";

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;

/**
 * Zod schema for article search query parameters.
 */
export const searchArticlesQuerySchema = z.object({
    q: z.string().trim().min(1, "Query parameter q is required"),
    limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(DEFAULT_SEARCH_LIMIT),
    cursor_published_at: z.string().datetime({ offset: true }).optional(),
    cursor_id: z.coerce.number().int().positive().optional(),
    ...articleFilterShape,
}).superRefine(function validateCursorPairing(values, context): void {
    const hasPublishedAt = values.cursor_published_at !== undefined;
    const hasCursorId = values.cursor_id !== undefined;

    if (hasPublishedAt !== hasCursorId) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "cursor_published_at and cursor_id must be provided together",
            path: ["cursor_published_at"],
        });
    }
});

/**
 * Parsed and validated article search query parameters.
 */
export type SearchArticlesQuery = z.infer<typeof searchArticlesQuerySchema>;

/**
 * Zod schema for the boolean query parse debug endpoint.
 */
export const parseBooleanQuerySchema = z.object({
    q: z.string().min(1, "Query parameter q is required"),
});

/**
 * Parsed boolean query debug request parameters.
 */
export type ParseBooleanQueryParams = z.infer<typeof parseBooleanQuerySchema>;
