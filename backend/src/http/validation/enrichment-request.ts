"use strict";

import { z } from "zod";

/**
 * Zod schema for the article id path parameter on the enrich endpoint.
 */
export const enrichArticleParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/**
 * Zod schema for the enrich endpoint query, where `force` re-runs enrichment
 * on an already-enriched article instead of returning the cached result.
 */
export const enrichArticleQuerySchema = z.object({
    force: z.coerce.boolean().default(false),
});
