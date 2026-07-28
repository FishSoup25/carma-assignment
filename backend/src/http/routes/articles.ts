"use strict";

import { Router } from "express";

import { executeArticleEnrichment } from "../../enrichment/enrichment-service.js";
import { executeArticleSearch, executeBooleanQueryParse } from "../../articles/search-service.js";
import { getPool } from "../../db/pool.js";
import {
    enrichArticleParamsSchema,
    enrichArticleQuerySchema,
} from "../validation/enrichment-request.js";
import {
    parseBooleanQuerySchema,
    searchArticlesQuerySchema,
} from "../validation/search-request.js";

/**
 * Create the articles router with boolean search endpoints.
 */
export function createArticlesRouter(): Router {
    const router = Router();

    router.get("/search/parse", createParseSearchHandler());
    router.get("/search", createSearchHandler());
    router.post("/:id/enrich", createEnrichArticleHandler());

    return router;
}

/**
 * Handle GET /api/articles/search/parse requests.
 */
function createParseSearchHandler(): import("express").RequestHandler {
    return async function parseSearchHandler(request, response, next): Promise<void> {
        try {
            const parsedQuery = parseBooleanQuerySchema.parse(request.query);
            const pool = getPool();
            const parseResult = await executeBooleanQueryParse(pool, parsedQuery.q);

            response.json(parseResult);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error("Unknown parse handler error"));
        }
    };
}

/**
 * Handle GET /api/articles/search requests.
 */
function createSearchHandler(): import("express").RequestHandler {
    return async function searchHandler(request, response, next): Promise<void> {
        try {
            const parsedQuery = searchArticlesQuerySchema.parse(request.query);
            const pool = getPool();
            const searchResult = await executeArticleSearch(pool, parsedQuery);

            response.json(searchResult);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error("Unknown search handler error"));
        }
    };
}

/**
 * Handle POST /api/articles/:id/enrich requests.
 */
function createEnrichArticleHandler(): import("express").RequestHandler {
    return async function enrichArticleHandler(request, response, next): Promise<void> {
        try {
            const parsedParams = enrichArticleParamsSchema.parse(request.params);
            const parsedQuery = enrichArticleQuerySchema.parse(request.query);
            const pool = getPool();
            const enrichmentResult = await executeArticleEnrichment(pool, {
                articleId: parsedParams.id,
                force: parsedQuery.force,
            });

            response.json(enrichmentResult);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error("Unknown enrich handler error"));
        }
    };
}