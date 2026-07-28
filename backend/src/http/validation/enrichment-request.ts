"use strict";

import { z } from "zod";

export const enrichArticleParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const enrichArticleQuerySchema = z.object({
    force: z.coerce.boolean().default(false),
});

export type EnrichArticleParams = z.infer<typeof enrichArticleParamsSchema>;
export type EnrichArticleQuery = z.infer<typeof enrichArticleQuerySchema>;
