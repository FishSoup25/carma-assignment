"use strict";

import { z } from "zod";

import {
    articleFilterShape,
    paginationShape,
    refineCursorPairing,
} from "./article-list-request.js";

/**
 * Zod schema for article search query parameters.
 */
export const searchArticlesQuerySchema = z.object({
    q: z.string().trim().min(1, "Query parameter q is required"),
    ...paginationShape,
    ...articleFilterShape,
}).superRefine(refineCursorPairing);

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
