"use strict";

import { Router } from "express";

import {
    executeArticleAggregate,
    executeArticleFacets,
    executeArticleList,
    executeArticleSearch,
    executeBooleanQueryParse,
} from "../../articles/search-service.js";
import { getPool } from "../../db/pool.js";
import { executeArticleEnrichment } from "../../enrichment/enrichment-service.js";
import { asyncRoute } from "../async-route.js";
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
 *
 * `/search/parse` is registered before `/search` so the more specific path is
 * not swallowed by the search handler.
 */
export function createArticlesRouter(): Router {
    const router = Router();

    router.get("/search/parse", asyncRoute(async function parseSearchHandler(request, response): Promise<void> {
        const parsedQuery = parseBooleanQuerySchema.parse(request.query);
        const parseResult = await executeBooleanQueryParse(getPool(), parsedQuery.q);

        response.json(parseResult);
    }));

    router.get("/search", asyncRoute(async function searchHandler(request, response): Promise<void> {
        const parsedQuery = searchArticlesQuerySchema.parse(request.query);
        const searchResult = await executeArticleSearch(getPool(), parsedQuery);

        response.json(searchResult);
    }));

    router.get("/aggregate", asyncRoute(async function aggregateHandler(request, response): Promise<void> {
        const parsedQuery = aggregateArticlesQuerySchema.parse(request.query);
        const aggregateResult = await executeArticleAggregate(getPool(), parsedQuery);

        response.json(aggregateResult);
    }));

    router.get("/facets", asyncRoute(async function facetsHandler(_request, response): Promise<void> {
        const facetsResult = await executeArticleFacets(getPool());

        response.json(facetsResult);
    }));

    router.get("/", asyncRoute(async function listHandler(request, response): Promise<void> {
        const parsedQuery = listArticlesQuerySchema.parse(request.query);
        const listResult = await executeArticleList(getPool(), parsedQuery);

        response.json(listResult);
    }));

    router.post("/:id/enrich", asyncRoute(async function enrichArticleHandler(request, response): Promise<void> {
        const parsedParams = enrichArticleParamsSchema.parse(request.params);
        const parsedQuery = enrichArticleQuerySchema.parse(request.query);
        const enrichmentResult = await executeArticleEnrichment(getPool(), {
            articleId: parsedParams.id,
            force: parsedQuery.force,
        });

        response.json(enrichmentResult);
    }));

    return router;
}
