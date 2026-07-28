"use strict";

import { Router } from "express";

import {
    executeArticleAggregate,
    executeArticleFacets,
    executeArticleList,
    executeArticleSearch,
    executeBooleanQueryParse,
} from "../../articles/search-service.js";
import { executeArticleEnrichment } from "../../enrichment/enrichment-service.js";
import { getPool } from "../../db/pool.js";
import {
    aggregateArticlesQuerySchema,
    listArticlesQuerySchema,
} from "../validation/article-list-request.js";
import {
    enrichArticleParamsSchema,
    enrichArticleQuerySchema,
} from "../validation/enrichment-request.js";
import {
    parseBooleanQuerySchema,
    searchArticlesQuerySchema,
} from "../validation/search-request.js";

/**
 * Create the articles router with list, search, aggregate, and enrich endpoints.
 */
export function createArticlesRouter(): Router {
    const router = Router();

    router.get("/search/parse", createParseSearchHandler());
    router.get("/search", createSearchHandler());
    router.get("/aggregate", createAggregateHandler());
    router.get("/facets", createFacetsHandler());
    router.get("/", createListHandler());
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
 * Handle GET /api/articles requests.
 */
function createListHandler(): import("express").RequestHandler {
    return async function listHandler(request, response, next): Promise<void> {
        try {
            const parsedQuery = listArticlesQuerySchema.parse(request.query);
            const pool = getPool();
            const listResult = await executeArticleList(pool, parsedQuery);

            response.json(listResult);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error("Unknown list handler error"));
        }
    };
}

/**
 * Handle GET /api/articles/aggregate requests.
 */
function createAggregateHandler(): import("express").RequestHandler {
    return async function aggregateHandler(request, response, next): Promise<void> {
        try {
            const parsedQuery = aggregateArticlesQuerySchema.parse(request.query);
            const pool = getPool();
            const aggregateResult = await executeArticleAggregate(pool, parsedQuery);

            response.json(aggregateResult);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error("Unknown aggregate handler error"));
        }
    };
}

/**
 * Handle GET /api/articles/facets requests.
 */
function createFacetsHandler(): import("express").RequestHandler {
    return async function facetsHandler(_request, response, next): Promise<void> {
        try {
            const pool = getPool();
            const facetsResult = await executeArticleFacets(pool);

            response.json(facetsResult);
        } catch (error) {
            if (error instanceof Error) {
                next(error);
                return;
            }

            next(new Error("Unknown facets handler error"));
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
